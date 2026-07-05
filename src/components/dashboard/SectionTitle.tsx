interface Props {
  icon: React.ElementType;
  label: string;
}

export function SectionTitle({ icon: Icon, label }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </h2>
    </div>
  );
}
