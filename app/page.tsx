import { ThemeToggle } from "@/components/theme-toggle";
import { InteractiveStockChart } from "@/components/InteractiveStockChart";
import { ErrorBoundary } from "react-error-boundary";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import GithubIcon from "@/components/icons/GithubIcon";
import { cn } from "@/lib/utils";
import localFont from "next/font/local";

const monoton = localFont({ src: '../public/fonts/Monoton-Regular.ttf' });

export default function Home() {
  return (
    <div className='min-h-screen flex flex-col'>
      <nav className='w-full flex flex-row items-center justify-between px-6 py-4 border-b'>
        <div className={`${monoton.className} text-4xl`}>
          Kynos
        </div>

        <div className="flex gap-2">
          <Link
            href={"https://github.com/olivercarmont/kynos"}
            target='_blank'
            rel='noreferrer'>
            <div
              className={cn(
                buttonVariants({
                  variant: "ghost",
                }),
                "h-[40px] w-[40px] px-0"
              )}>
              <GithubIcon className='h-[1.2rem] w-[1.2rem]' />
              <span className='sr-only'>GitHub</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <ErrorBoundary
            fallback={
              <span className='text-sm text-red-600'>
                Error with API 😅 - Please try again later.
              </span>
            }>
            <InteractiveStockChart />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}