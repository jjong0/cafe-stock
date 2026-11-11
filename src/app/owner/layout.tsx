import { OwnerTabs } from "@/components/OwnerTabs";

export default function OwnerLayout({ children }: LayoutProps<"/owner">) {
  return (
    <>
      <OwnerTabs />
      {children}
    </>
  );
}
