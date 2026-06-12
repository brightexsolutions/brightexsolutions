"use client";

import { useEffect, useState } from "react";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground">
        {greeting}, {name}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Stay on top of your projects, track revenue, and monitor client activity.
      </p>
    </div>
  );
}
