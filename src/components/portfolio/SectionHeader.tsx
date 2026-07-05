interface Props {
  title: string;
  icon: React.ElementType;
}

export function SectionHeader({ title, icon: Icon }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/15 to-transparent border-b border-primary/20">
      <Icon className="size-3.5 text-primary" />
      <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{title}</p>
    </div>
  );
}
