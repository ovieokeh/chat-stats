"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useTheme } from "next-themes";
import {
  Calendar,
  Clock,
  EyeOff,
  Flame,
  Lock,
  MessageSquare,
  Moon,
  Repeat,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  Zap,
} from "lucide-react";
import { FileImporter } from "./components/FileImporter";
import { PageLayout } from "./components/Layout/PageLayout";
import { InsightCard } from "./components/UI/InsightCard";
import { KpiTile } from "./components/UI/KpiTile";
import { Skeleton } from "./components/UI/Skeleton";
import { db } from "./lib/db";
import { useText } from "./hooks/useText";

export default function Home() {
  const imports = useLiveQuery(() => db.imports.orderBy("importedAt").reverse().toArray());
  const { t } = useText();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const currentTheme = theme === "system" ? (resolvedTheme === "dark" ? "obsidian" : "bone") : (theme as string);
  const themeOrder = ["bone", "obsidian", "ember"];
  const currentThemeIndex = Math.max(0, themeOrder.indexOf(currentTheme));
  const nextTheme = themeOrder[(currentThemeIndex + 1) % themeOrder.length];
  const themeLabel = currentTheme === "bone" ? "Bone" : currentTheme === "ember" ? "Ember" : "Obsidian";
  const ThemeIcon = currentTheme === "bone" ? Sun : currentTheme === "ember" ? Flame : Moon;

  const kpis = [
    { label: t("home.kpis.messages"), value: "12.4k" },
    { label: t("home.kpis.replySpeed"), value: "3:12" },
    { label: t("home.kpis.peakHour"), value: "23:11" },
    { label: t("home.kpis.streak"), value: "18d" },
  ];

  const insights = [
    {
      title: t("home.insights.replySpeed.title"),
      value: "3:12",
      delta: t("home.insights.replySpeed.delta"),
      explanation: t("home.insights.replySpeed.explain"),
      icon: Clock,
      variant: "glow" as const,
    },
    {
      title: t("home.insights.nightOwl.title"),
      value: "41%",
      explanation: t("home.insights.nightOwl.explain"),
      icon: Moon,
    },
    {
      title: t("home.insights.doubleText.title"),
      value: "28%",
      explanation: t("home.insights.doubleText.explain"),
      icon: Repeat,
    },
    {
      title: t("home.insights.starter.title"),
      value: "34%",
      explanation: t("home.insights.starter.explain"),
      icon: Zap,
    },
    {
      title: t("home.insights.peakDay.title"),
      value: "Sun",
      explanation: t("home.insights.peakDay.explain"),
      icon: Calendar,
    },
    {
      title: t("home.insights.longGap.title"),
      value: "2d 4h",
      explanation: t("home.insights.longGap.explain"),
      icon: Clock,
    },
  ];

  return (
    <PageLayout maxWidth="full">
      <div className="space-y-20 md:space-y-32 py-8 md:py-12">
        <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-semibold font-display">{t("home.title")}</div>
              <div className="text-xs uppercase tracking-[0.3em] text-base-content/50">{t("home.tagline")}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-outline">{t("home.hero.badgePrivate")}</span>
            <span className="badge badge-outline hidden sm:inline-flex">{t("home.hero.badgeLocal")}</span>
            <span className="badge badge-outline hidden md:inline-flex">{t("home.hero.badgeShareable")}</span>
            <button
              className="btn btn-ghost btn-sm gap-2 normal-case font-medium"
              onClick={() => setTheme(nextTheme)}
              title={`Theme: ${themeLabel}`}
            >
              <ThemeIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{themeLabel}</span>
            </button>
          </div>
        </header>

        <section className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-display">{t("home.hero.title")}</h1>
            <p className="text-lg md:text-xl text-base-content/70 max-w-xl">{t("home.hero.subtitle")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <a href="#import" className="btn btn-primary btn-lg">
                {t("home.hero.ctaUpload")}
              </a>
            </div>
            <div className="card bg-base-100 border border-base-300/60 rounded-3xl p-6 max-w-md">
              <div className="text-xs uppercase tracking-[0.3em] text-base-content/50">
                {t("home.hero.statCaption")}
              </div>
              <div className="text-5xl md:text-6xl font-semibold font-display tabular-nums mt-3">12.4k</div>
              <div className="text-sm text-base-content/60 mt-1">{t("home.hero.statLabel")}</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-8 -right-6 w-56 h-56 bg-primary/20 blur-3xl rounded-full" />
            <div className="grid gap-4">
              <div className="card bg-base-100 border border-base-300/60 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/landing/dashboard.webp"
                    alt="ChatWrapped dashboard preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-base-100 border border-base-300/60 rounded-[2rem] overflow-hidden shadow-xl">
                  <div className="aspect-[9/16] relative">
                    <Image src="/landing/moments.webp" alt="Insight card preview" fill className="object-contain" />
                  </div>
                </div>
                <div className="card bg-base-100 border border-base-300/60 rounded-[2rem] overflow-hidden shadow-xl">
                  <div className="aspect-[9/16] relative">
                    <Image src="/landing/share.webp" alt="Share poster preview" fill className="object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="import" className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1fr_1.1fr] items-start">
          <div className="space-y-6 text-center lg:text-left">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-semibold font-display">{t("home.importer.title")}</h2>
              <p className="text-base-content/70">{t("home.importer.subtitle")}</p>
            </div>
            <FileImporter />
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-semibold font-display">{t("home.how.title")}</h3>
            <p className="text-base-content/70">{t("home.how.subtitle")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card bg-base-100 border border-base-300/60 rounded-3xl p-6 space-y-4">
                <div className="text-sm uppercase tracking-[0.3em] text-base-content/50">{t("home.how.ios.title")}</div>
                <ol className="space-y-3 text-sm text-base-content/80">
                  <li className="flex gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">1</span>
                    <span>{t("home.how.ios.step1")}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">2</span>
                    <span>{t("home.how.ios.step2")}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">3</span>
                    <span>{t("home.how.ios.step3")}</span>
                  </li>
                </ol>
              </div>
              <div className="card bg-base-100 border border-base-300/60 rounded-3xl p-6 space-y-4">
                <div className="text-sm uppercase tracking-[0.3em] text-base-content/50">
                  {t("home.how.android.title")}
                </div>
                <ol className="space-y-3 text-sm text-base-content/80">
                  <li className="flex gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">1</span>
                    <span>{t("home.how.android.step1")}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">2</span>
                    <span>{t("home.how.android.step2")}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">3</span>
                    <span>{t("home.how.android.step3")}</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-semibold font-display">{t("home.privacy.title")}</h2>
            <p className="text-base-content/70">{t("home.privacy.subtitle")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="card bg-base-100 border border-base-300/60 rounded-2xl p-5 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{t("home.privacy.bullets.local")}</span>
            </div>
            <div className="card bg-base-100 border border-base-300/60 rounded-2xl p-5 flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{t("home.privacy.bullets.login")}</span>
            </div>
            <div className="card bg-base-100 border border-base-300/60 rounded-2xl p-5 flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{t("home.privacy.bullets.delete")}</span>
            </div>
            <div className="card bg-base-100 border border-base-300/60 rounded-2xl p-5 flex items-center gap-3">
              <EyeOff className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{t("home.privacy.bullets.privacyMode")}</span>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-semibold font-display">{t("home.insights.title")}</h2>
            <p className="text-base-content/70">{t("home.insights.subtitle")}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight) => (
              <InsightCard
                key={insight.title}
                title={insight.title}
                value={insight.value}
                delta={insight.delta}
                explanation={insight.explanation}
                icon={insight.icon}
                variant={insight.variant}
              />
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1fr_1.1fr] items-center">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold font-display">{t("home.share.title")}</h2>
            <p className="text-base-content/70">{t("home.share.subtitle")}</p>
          </div>
          <div className="card bg-base-100 border border-base-300/60 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="aspect-[9/16] relative">
              <Image src="/landing/wrapped.webp" alt="Share card preview" fill className="object-cover" />
            </div>
          </div>
        </section>

        {!imports ? (
          <section className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-7 w-32 mb-4 ml-2" />
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card bg-base-100 border border-base-300 h-24 p-4">
                  <div className="flex items-center gap-4 h-full">
                    <Skeleton variant="rectangular" className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : imports.length > 0 ? (
          <section className="max-w-5xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold ml-2 opacity-80">{t("home.recentImports")}</h2>
            <div className="grid gap-4">
              {imports.map((imp) => (
                <Link key={imp.id} href={`/imports/${imp.id}`}>
                  <div className="card bg-base-100 hover:shadow-lg transition-all border border-base-300">
                    <div className="card-body flex-row items-center gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{imp.filename}</h3>
                        <p className="text-sm opacity-60">{format(imp.importedAt, "MMM d, yyyy • HH:mm")}</p>
                      </div>
                      <button className="btn btn-ghost btn-sm">{t("home.viewDashboard")}</button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="pt-8 pb-6 flex justify-center border-t border-base-300/30">
          <button
            className="text-xs font-semibold opacity-30 hover:opacity-100 hover:text-error transition-all uppercase tracking-widest p-2"
            onClick={async () => {
              if (confirm(t("home.resetConfirm"))) {
                const { clearDatabase } = await import("./lib/db");
                await clearDatabase();
                window.location.reload();
              }
            }}
          >
            {t("home.clearData")}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
