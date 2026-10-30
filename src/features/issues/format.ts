const MINUTE = 60 * 1000;

// 서버(UTC)와 브라우저가 같은 문자열을 만들도록 시간대를 한국으로 고정한다
const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function formatElapsed(fromIso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / MINUTE));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 === 0 ? `${hours}시간` : `${hours}시간 ${minutes % 60}분`;
  return `${Math.floor(hours / 24)}일 ${hours % 24}시간`;
}

// 오래 방치된 이슈를 눈에 띄게 하려는 기준(시간)
export const LONG_WAIT_HOURS = 3;

export function isLongWait(fromIso: string, now: number): boolean {
  return now - new Date(fromIso).getTime() >= LONG_WAIT_HOURS * 60 * MINUTE;
}
