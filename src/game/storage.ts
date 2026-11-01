import { createInitialState, STARTING_RODS } from './engine';
import { STORY_NODES } from '../story/content';
import type { GameState } from './types';

export const storageKey = (demo: boolean) => `yizhaiyiri:${demo ? 'demo' : 'main'}:v1`;

export function loadGame(demo: boolean): GameState {
  const value = localStorage.getItem(storageKey(demo));
  if (!value) return createInitialState();
  let state = JSON.parse(value) as GameState;
  if (state.version !== 1) throw new Error('这份存档来自其他版本，请先导出备份再升级。');
  if (!('story' in state) || 'adventure' in state) {
    const { adventure: _oldAdventure, ...retained } = state as GameState & { adventure?: unknown };
    state = { ...retained, story: retained.story ?? null };
  }
  let changed = false;
  if (state.session && !state.session.activityId && state.session.retreat !== 'daybed') {
    // Continue saved desk timers on the daybed without changing their clock or rewards.
    state = { ...state, session: { ...state.session, retreat: 'daybed' } };
    changed = true;
  }
  if (state.healthyTaskCount === undefined) {
    state = { ...state, healthyTaskCount: new Set(state.completedActivities).size };
    changed = true;
  }
  if (state.sleep) {
    // Retire the old six-hour return mechanic; historical memories remain intact.
    state = { ...state, sleep: null };
    changed = true;
  }
  if (!state.startingRodsGranted) {
    // Seed only a pristine old save. Earned balances and spent entry fees stay intact.
    state = { ...state, startingRodsGranted: true,
      rods: !state.memories.length && !state.story ? Math.max(STARTING_RODS, state.rods) : state.rods };
    changed = true;
  }
  if (state.story && !STORY_NODES[state.story.nodeId]) {
    const aliases: Record<string, string> = {
      'a5-vessels-result': 'a5-vessels', 'a6-luggage': 'a6-discussion', 'a6-moving-letter': 'a6-discussion',
      'a6-letter': 'a6-discussion', 'a6-dogs': 'a6-discussion', 'a6-aftermath': 'a6-discussion',
      'a6-dogs-letter': 'a6-discussion', 'a6-compare': 'a6-discussion', 'a6-arrival': 'a6-weisheng',
      'a7-inventory': 'a7-inventory-verified', 'a7-inventory-start': 'a7-confession',
      'a7-inventory-list': 'a7-inventory-verified', 'a7-inventory-objects': 'a7-inventory-verified', 'a7-last': 'a7-river',
    };
    state = { ...state, story: { ...state.story, nodeId: aliases[state.story.nodeId] ?? 'opening' } };
    changed = true;
  }
  if (changed) saveGame(state, demo);
  return state;
}

export function saveGame(state: GameState, demo: boolean): void {
  localStorage.setItem(storageKey(demo), JSON.stringify(state));
}

let photoDatabase: Promise<IDBDatabase> | undefined;
function openPhotos(): Promise<IDBDatabase> {
  if (!photoDatabase) {
    photoDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open('yizhaiyiri-photos-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { photoDatabase = undefined; reject(new Error('暂时无法打开照片存储，请检查浏览器的存储权限。')); };
    });
  }
  return photoDatabase;
}

/** Blobs stay in IndexedDB; localStorage contains only photo identifiers. */
export async function savePhoto(file: Blob, demo = false): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件。');
  const db = await openPhotos();
  const id = `${demo ? 'demo' : 'main'}:${crypto.randomUUID()}`;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('照片没有保存成功，可能是浏览器存储空间不足。'));
    tx.onabort = () => reject(new Error('照片保存已中断，请重试。'));
  });
  return id;
}

export async function photoBlob(id: string, _demo?: boolean): Promise<Blob | undefined> {
  const db = await openPhotos();
  return new Promise((resolve, reject) => {
    const request = db.transaction('photos', 'readonly').objectStore('photos').get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(new Error('暂时无法读取这张照片。'));
  });
}

// Serializes fallback callers within the tab. Web Locks additionally serialize different tabs.
let commandQueue: Promise<unknown> = Promise.resolve();
export async function withGameLock<T>(demo: boolean, operation: () => T | Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return await navigator.locks.request(storageKey(demo), operation);
  }
  const next = commandQueue.then(operation, operation);
  commandQueue = next.catch(() => undefined);
  return next;
}
