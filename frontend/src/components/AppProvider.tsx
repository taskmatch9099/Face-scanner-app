import VantaBackground from "./VantaBackground";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <VantaBackground />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default AppProvider;
