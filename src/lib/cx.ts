// 조건부 className 조합. clsx 수준의 기능만 필요해서 직접 둔다
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
