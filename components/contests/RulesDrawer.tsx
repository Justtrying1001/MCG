import { Drawer } from "@/components/ui/Drawer";

export function RulesDrawer({
  open,
  onClose,
  rosterSize,
  restrictedSet,
  status,
}: {
  open: boolean;
  onClose: () => void;
  rosterSize: number;
  restrictedSet: boolean;
  status: string;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Battle rules">
      <div className="contest-rules-drawer">
        <p><strong>Roster size:</strong> {rosterSize}</p>
        <p><strong>Card restriction:</strong> {restrictedSet ? "Specific set only" : "Any set allowed"}</p>
        <p><strong>Current battle state:</strong> {status}</p>
        <p className="contest-inline-note">Detailed mechanics remain server-side enforced. This panel only clarifies user-facing constraints.</p>
      </div>
    </Drawer>
  );
}
