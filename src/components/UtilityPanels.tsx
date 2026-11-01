import { Camera, Compass, Settings2 } from 'lucide-react';

export interface HelpPanelProps {
  onClose: () => void;
}

export function HelpPanel({ onClose }: HelpPanelProps) {
  return <div className="prose-panel">
    <span className="dialog-icon"><Compass/></span>
    <h2>在宅院里，慢慢过一天。</h2>
    <p>以第一人称在宅院里行走：W A S D 或键盘方向键移动；触控板双指上下左右滑动，直接环顾。使用鼠标时，按住画面拖动也可以环顾。走进中央书阁，靠近床榻后点击提示打坐；走近书案可触碰金银筒。走近回廊门口后，点击提示进入房间。</p>
    <ol>
      <li><b>全院鸟瞰：</b>点击右上角「全院鸟瞰」，从上方欣赏双进院落。拖动旋转、滚轮缩放、右键平移；手机上单指旋转、双指缩放与平移。点击「返回行走」或按 Esc，可回到原来的位置与朝向。</li>
      <li><b>一日光景：</b>场景随时间变化，17:00—19:30 为夕阳，19:30 至次日 06:00 为黑夜，其余为白天。朝食和夕食时，厨房有炊烟。任务之间和完成当前任务后，左下角显示「闲时」。</li>
      <li><b>床榻打坐：</b>走近中央书斋的床榻，点击「在榻上打坐」。镜头入座后开始 30 分钟计时，演示模式为 10 秒。完成后得 1 枚算筹，并计入原有专注记录。右下角计时旁的省略号（或 Esc）可暂停、继续、结束，提前结束不计奖励。结束后回到原来的位置与朝向。</li>
      <li><b>按时生活：</b>点击左下角银钩，阅读字条并前往相约地点。靠近银钩后，可陪他专注片刻，或上传此刻的生活图片。请在相应时段内完成。闲时可自在散步、打坐。</li>
      <li><b>记下今天：</b>照片、卡片、打坐记录会留在右上角的记忆本里。每天同一段相约时光只记录一次。</li>
      <li><b>筒中奇境：</b>书案上的金银筒高 34 厘米，每得一枚算筹，筒中便添一签。走近并触碰金银筒可查看筹数，满 10 枚时会提示「似有异动」。点击「入境」后，祥云将你卷入冒险，每次进入消耗 10 枚算筹。返回庭院会保留当前进度。</li>
    </ol>
    <p className="muted">照片和记录保存在当前浏览器中，清除网站数据会一并删除；当前版本不含账号与跨设备同步。</p>
    <button className="primary full" onClick={onClose}>回到庭院</button>
  </div>;
}

export interface SettingsPanelProps {
  demo: boolean;
  period: string;
  busy: boolean;
  onSwitchDemo: () => void;
  onPeriodChange: (period: string) => void;
  onSetDemoRods: () => void | Promise<void>;
  outdoorsDemoBlocked: boolean;
  onDemoOutdoors: () => void | Promise<void>;
}

export function SettingsPanel({ demo, period, busy, onSwitchDemo, onPeriodChange, onSetDemoRods, outdoorsDemoBlocked, onDemoOutdoors }: SettingsPanelProps) {
  return <div className="prose-panel">
    <span className="dialog-icon"><Settings2/></span>
    <h2>让一天，按你的节奏展开。</h2>
    <p>日常模式使用设备的本地时间。演示模式有单独的存档，用来快速体验完整流程。</p>
    <button className="primary full" onClick={onSwitchDemo}>{demo ? '回到日常模式' : '进入演示模式'}</button>
    {demo ? <div className="demo-settings">
      <label htmlFor="demo-period">预览一个时段</label>
      <select id="demo-period" value={period} onChange={event => onPeriodChange(event.target.value)}>
        <option value="real">跟随当前时间</option>
        <option value="8">晨读 · 08:00</option>
        <option value="12">朝食 · 12:00</option>
        <option value="16">外出 · 16:00</option>
        <option value="19">夕食 · 19:00</option>
        <option value="23">就寝 · 23:00</option>
        <option value="10">闲时 · 10:00</option>
      </select>
      <button className="primary full" disabled={busy || outdoorsDemoBlocked} onClick={() => void onDemoOutdoors()}>外出得卡演示</button>
      <button className="secondary full" disabled={busy} onClick={() => void onSetDemoRods()}>演示算筹设为 10 枚</button>
    </div> : null}
  </div>;
}

export interface PhotoPreviewProps {
  url: string;
  busy: boolean;
  onSubmit: () => void | Promise<void>;
}

export function PhotoPreview({ url, busy, onSubmit }: PhotoPreviewProps) {
  return <div className="photo-preview">
    <Camera size={25}/>
    <h2>留住这一刻</h2>
    <p>把这一刻的生活，收进今天的记忆本。</p>
    <img src={url} alt="即将收入记忆本的生活照片"/>
    <button className="primary full" disabled={busy} onClick={() => void onSubmit()}>{busy ? '正在保存…' : '收进今日记忆'}</button>
  </div>;
}
