export default function VigilanteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: '#1a1612' }}>
      {children}
    </div>
  )
}
