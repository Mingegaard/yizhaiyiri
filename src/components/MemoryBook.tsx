import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Camera, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MemoryEntry } from '../game/types';
import { localDay } from '../game/engine';
import { photoBlob } from '../game/storage';
import { cardImageUrl, knowledgeCards } from '../content/cards';
import { calendarCells, lunarDate, memoriesForBook, memoryActivity, memoryActivityLabels, memoryColumns, memorySentences } from '../game/memoryBook';
import { HealthyKnowledge } from './HealthyKnowledge';
import './book.css';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
const elfScenes = `${import.meta.env.BASE_URL}cards/memory-elf-scenes.png`;
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);

function MemoryPhoto({ id, demo, label }: { id: string; demo: boolean; label: string }) {
  const [photo, setPhoto] = useState<{ url?: string; error?: string }>({});
  useEffect(() => {
    let live = true;
    let objectUrl: string | undefined;
    setPhoto({});
    photoBlob(id, demo).then(blob => {
      if (!live) return;
      if (!blob) { setPhoto({ error: '这张打卡照片暂不可用。' }); return; }
      objectUrl = URL.createObjectURL(blob);
      setPhoto({ url: objectUrl });
    }).catch(() => { if (live) setPhoto({ error: '打卡照片暂时无法读取。' }); });
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, demo]);
  return photo.url ? <a className="memory-tile task-photo" href={photo.url} target="_blank" rel="noreferrer" aria-label={`查看${label}打卡原图`}>
    <img src={photo.url} alt={`${label}任务打卡照片`}/>
  </a> : <div className="memory-tile photo-unavailable" role="img" aria-label={photo.error ?? '正在读取打卡照片'} title={photo.error}>
    <Camera size={20} strokeWidth={1}/>
  </div>;
}

function ElfPicture({ cardId, label, onOpen }: { cardId: string; label: string; onOpen: (id: string) => void }) {
  const card = knowledgeCards[cardId];
  return <button type="button" className={`memory-tile elf-picture motif-${card?.motif ?? 'adventure'}`} aria-label={`查看卡片：${card?.title ?? label}`} onClick={() => onOpen(cardId)}>
    {card?.image ? <img className="collected-card-art" src={cardImageUrl(card.image)} alt={card.title}/> : <img className="elf-scene-art" src={elfScenes} alt="" aria-hidden="true" decoding="async"/>}
  </button>;
}

function PictureMatrix({ entries, demo, onOpenCard }: { entries: MemoryEntry[]; demo: boolean; onOpenCard: (id: string) => void }) {
  const columns = memoryColumns(entries);
  if (!columns.length) return <div className="almanac-media media-empty" aria-label="尚无任务打卡照片或来信"/>;
  const photoRows = Math.max(...columns.map(column => column.photoIds.length));
  const cards = columns.map(column => [...new Set(entries.filter(entry => entry.cardId && memoryActivity(entry) === column.activity).map(entry => entry.cardId!))]);
  const cardRows = Math.max(...cards.map(ids => ids.length));
  return <div className="almanac-media" role="group" aria-label="按活动分列的来信与打卡照片" style={{ '--memory-columns': columns.length } as CSSProperties}>
    {Array.from({ length: Math.max(1, cardRows) }, (_, row) => <Fragment key={`cards:${row}`}>{columns.map((column, index) => cards[index][row]
      ? <ElfPicture key={column.activity} cardId={cards[index][row]} label={memoryActivityLabels[column.activity]} onOpen={onOpenCard}/>
      : <div key={column.activity} className="memory-tile tile-empty" aria-hidden="true"/>)}</Fragment>)}
    {Array.from({ length: photoRows }, (_, row) => <Fragment key={row}>{columns.map(column => column.photoIds[row]
      ? <MemoryPhoto key={column.activity} id={column.photoIds[row]} demo={demo} label={memoryActivityLabels[column.activity]}/>
      : <div key={column.activity} className="memory-tile tile-empty" aria-hidden="true"/>)}</Fragment>)}
  </div>;
}

function DateBlock({ date }: { date: Date }) {
  const lunar = lunarDate(date);
  return <div className="almanac-date">
    <time dateTime={localDay(date)}><span className="almanac-year">{date.getFullYear()} · {String(date.getMonth() + 1).padStart(2, '0')}</span><strong>{date.getDate()}</strong></time>
    <span className="almanac-weekday">{date.toLocaleDateString('zh-CN', { weekday: 'long' })}</span>
    <div className="almanac-lunar"><span>{lunar.year}</span><span>{lunar.monthDay}</span></div>
  </div>;
}

function CalendarWheel({ onClick }: { onClick: () => void }) {
  return <button type="button" className="calendar-wheel" onClick={onClick} aria-label="打开月历" title="翻阅往日">
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth=".85" aria-hidden="true">
      <circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="15.5"/>
      <path d="M24 5v4m0 30v4M5 24h4m30 0h4M10.6 10.6l2.8 2.8m21.2 21.2 2.8 2.8M10.6 37.4l2.8-2.8m21.2-21.2 2.8-2.8M20 18h8v12h-8zm0 6h8"/>
    </svg>
  </button>;
}

function CalendarPage({ month, selectedDate, today, memories, entries, demo, onMonthChange, onSelect, onOpen, onOpenCard }: {
  month: Date; selectedDate: string; today: string; memories: MemoryEntry[]; entries: MemoryEntry[]; demo: boolean;
  onMonthChange: (date: Date) => void; onSelect: (key: string) => void; onOpen: () => void;
  onOpenCard: (id: string) => void;
}) {
  const recordedDates = useMemo(() => new Set(memories.map(entry => entry.date)), [memories]);
  const year = month.getFullYear();
  const monthNumber = month.getMonth();
  const cells = calendarCells(year, monthNumber);
  const selected = dateFromKey(selectedDate);
  const hasSelection = selected.getFullYear() === year && selected.getMonth() === monthNumber && entries.length > 0;
  const years = memories.map(entry => Number(entry.date.slice(0, 4))).filter(Number.isFinite);
  const currentYear = dateFromKey(today).getFullYear();
  const firstYear = Math.min(currentYear - 100, year, ...years);
  const lastYear = Math.max(currentYear + 100, year, ...years);
  const preview = hasSelection ? memoryColumns(entries).flatMap(column => [
    ...(column.cardId ? [{ kind: 'elf' as const, id: column.cardId, label: memoryActivityLabels[column.activity] }] : []),
    ...column.photoIds.map(id => ({ kind: 'photo' as const, id, label: memoryActivityLabels[column.activity] })),
  ]).slice(0, 3) : [];
  return <div className="almanac-calendar">
    <div className="almanac-month-controls">
      <button type="button" className="book-arrow" aria-label="上个月" onClick={() => onMonthChange(new Date(year, monthNumber - 1, 1))}><ChevronLeft size={20} strokeWidth={1}/></button>
      <div className="almanac-selectors">
        <label><span className="visually-hidden">选择年份</span><select aria-label="选择年份" value={year} onChange={event => onMonthChange(new Date(Number(event.target.value), monthNumber, 1))}>{Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index).map(value => <option value={value} key={value}>{value} 年</option>)}</select><ChevronDown size={12} aria-hidden="true"/></label>
        <span className="month-divider" aria-hidden="true">·</span>
        <label><span className="visually-hidden">选择月份</span><select aria-label="选择月份" value={monthNumber} onChange={event => onMonthChange(new Date(year, Number(event.target.value), 1))}>{Array.from({ length: 12 }, (_, index) => <option value={index} key={index}>{index + 1} 月</option>)}</select><ChevronDown size={12} aria-hidden="true"/></label>
      </div>
      <button type="button" className="book-arrow" aria-label="下个月" onClick={() => onMonthChange(new Date(year, monthNumber + 1, 1))}><ChevronRight size={20} strokeWidth={1}/></button>
      <button type="button" className="calendar-today" onClick={() => { const date = dateFromKey(today); onMonthChange(new Date(date.getFullYear(), date.getMonth(), 1)); onSelect(today); }}>回到今日</button>
    </div>
    <div className="almanac-weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
    <div className="almanac-days" role="group" aria-label={`${year}年${monthNumber + 1}月的记忆日历`}>
      {cells.map((key, index) => key ? <button type="button" key={key} className={key === selectedDate ? 'is-selected' : ''} disabled={!recordedDates.has(key)} aria-label={`${year}年${monthNumber + 1}月${dateFromKey(key).getDate()}日，${recordedDates.has(key) ? '有记忆' : '无记忆'}`} aria-pressed={key === selectedDate} aria-current={key === today ? 'date' : undefined} onClick={() => onSelect(key)}>
        <span>{dateFromKey(key).getDate()}</span>{recordedDates.has(key) ? <i className="memory-seal" aria-hidden="true"/> : null}
      </button> : <span key={`blank:${index}`} className="calendar-blank" aria-hidden="true"/>)}
    </div>
    <div className={`calendar-preview ${hasSelection ? '' : 'preview-empty'}`}>
      {hasSelection ? <><DateBlock date={selected}/><div className="calendar-thumbnails">{preview.map((item, index) => item.kind === 'elf' ? <ElfPicture key={`${item.id}:${index}`} cardId={item.id} label={item.label} onOpen={onOpenCard}/> : <MemoryPhoto key={`${item.id}:${index}`} id={item.id} demo={demo} label={item.label}/>)}</div></> : <div/>}
      <button type="button" className="open-memory-day" disabled={!hasSelection} onClick={onOpen}>翻开此日<ChevronRight size={15} strokeWidth={1}/></button>
    </div>
  </div>;
}

export function MemoryBook({ memories, demo }: { memories: MemoryEntry[]; demo: boolean }) {
  const today = localDay(Date.now());
  const [view, setView] = useState<'day' | 'calendar'>('day');
  const [openedCardId, setOpenedCardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const heading = useRef<HTMLHeadingElement>(null);
  const bookMemories = useMemo(() => memoriesForBook(memories, demo), [memories, demo]);
  const entries = useMemo(() => bookMemories.filter(entry => entry.date === selectedDate).sort((a, b) => a.timestamp - b.timestamp), [bookMemories, selectedDate]);
  const sentences = useMemo(() => memorySentences(entries), [entries]);
  const selected = dateFromKey(selectedDate);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [view, openedCardId]);
  function moveDay(direction: number) {
    const date = dateFromKey(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(localDay(date));
  }
  function openCalendar() {
    setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setView('calendar');
  }
  if (openedCardId) return <section className="memory-card-review" aria-label="珍藏卡片"><HealthyKnowledge cardId={openedCardId} closeLabel="返回记忆本" onClose={() => setOpenedCardId(null)}/></section>;
  return <section className={`memory-book view-${view}`} aria-label="记忆本" data-testid="memory-book">
    <header className="almanac-heading">
      <button type="button" className="book-arrow" aria-label={view === 'day' ? '前一天' : '返回日页'} onClick={() => view === 'day' ? moveDay(-1) : setView('day')}>{view === 'day' ? <ChevronLeft size={20} strokeWidth={1}/> : <ArrowLeft size={19} strokeWidth={1}/>}</button>
      <h2 ref={heading} tabIndex={-1}>记忆本</h2>
      {view === 'day' ? <button type="button" className="book-arrow" aria-label="后一天" onClick={() => moveDay(1)}><ChevronRight size={20} strokeWidth={1}/></button> : <span/>}
    </header>
    {view === 'day' ? <>
      <PictureMatrix entries={entries} demo={demo} onOpenCard={setOpenedCardId}/>
      <div className="almanac-day-content">
        <DateBlock date={selected}/>
        <ul className="almanac-sentences" aria-label="这一日的记录">{sentences.map(sentence => <li key={sentence}>{sentence}</li>)}</ul>
        <CalendarWheel onClick={openCalendar}/>
      </div>
    </> : <CalendarPage month={month} selectedDate={selectedDate} today={today} memories={bookMemories} entries={entries} demo={demo} onMonthChange={setMonth} onSelect={setSelectedDate} onOpen={() => setView('day')} onOpenCard={setOpenedCardId}/>}
  </section>;
}
