export default function Dot({ size, isLoading }: { size: number; isLoading: boolean }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full`}
      style={{
        backgroundColor: isLoading ? '#2693FF' : 'var(--icon-extra-subtle)',
      }}
    />
  );
}
