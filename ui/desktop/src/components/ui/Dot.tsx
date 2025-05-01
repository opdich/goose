export default function Dot({ size, isActive }: { size: number; isActive: boolean }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full`}
      style={{
        backgroundColor: isActive ? '#2693FF' : 'var(--icon-extra-subtle)',
      }}
    />
  );
}
