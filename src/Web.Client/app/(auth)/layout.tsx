export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Tydee</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simple envelope budgeting
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
