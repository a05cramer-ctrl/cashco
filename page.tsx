import { Board } from "@/components/board";
import { Born } from "@/components/born";
import { Casino } from "@/components/casino";
import { CurveRail } from "@/components/curve-rail";
import { Footer } from "@/components/footer";
import { Herd } from "@/components/herd";
import { Hero } from "@/components/hero";
import { HowToBuy } from "@/components/how-to-buy";
import { Marquee } from "@/components/marquee";
import { MilkMachine } from "@/components/milk-machine";
import { Nav } from "@/components/nav";
import { Passport } from "@/components/passport";
import { RevealObserver } from "@/components/reveal";
import { DairyProvider } from "@/components/state";
import { Thesis } from "@/components/thesis";

export default function Home() {
  return (
    <DairyProvider>
      <Nav />
      <main>
        <Hero />
        <Marquee variant="mint" />
        <MilkMachine />
        <Casino />
        <Thesis />
        <Born />
        <Board />
        <Passport />
        <Marquee />
        <HowToBuy />
        <Herd />
      </main>
      <Footer />
      <CurveRail />
      <RevealObserver />
    </DairyProvider>
  );
}
