"use client";

/**
 * The Brightex countersignature: name, title and mark.
 *
 * Stored once and stamped onto every agreement at creation, so a client never
 * receives a contract that is blank on our side. Kept here rather than typed
 * per document because a signature that has to be remembered is one that will
 * eventually be missing from a contract.
 *
 * Self-contained (its own save button, outside the page's form) because it
 * posts an image through its own route, and because a canvas nested in a form
 * that submits on Enter is a good way to lose a signature mid-draw.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, PenLine, Trash2, Upload, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

import type { SignatureInputMethod } from "@/lib/signature-image";

/**
 * What the two tabs are called in the UI. Deliberately not the stored
 * vocabulary: "Draw it" reads better on a button than "Drawn". toMethod()
 * is the single place the two are reconciled.
 */
type Mode = "draw" | "upload";

const toMethod = (mode: Mode): SignatureInputMethod => (mode === "draw" ? "drawn" : "upload");

interface SignatureState {
  name: string;
  title: string;
  hasSignature: boolean;
  image: string | null;
}

export function SignatureSettings() {
  const confirm = useConfirm();
  const [state, setState] = useState<SignatureState | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("draw");
  const [pending, setPending] = useState<string | null>(null);
  const [pendingMethod, setPendingMethod] = useState<Mode>("draw");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawnRef = useRef(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings/signature")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || json.error) return;
        setState(json);
        setName(json.name ?? "");
        setTitle(json.title ?? "");
      })
      .catch(() => { if (!cancelled) setError("Could not load the signature settings."); });
    return () => { cancelled = true; };
  }, []);

  // ── Canvas ───────────────────────────────────────────────────────────────
  const setupCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0d1f4e";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "draw") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;
    const pos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = "touches" in e ? e.touches[0] : e;
      return {
        x: (p.clientX - r.left) * (canvas.width / r.width),
        y: (p.clientY - r.top) * (canvas.height / r.height),
      };
    };
    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      drawnRef.current = true;
    };
    const end = () => {
      if (!drawing) return;
      drawing = false;
      if (drawnRef.current) setPending(canvas.toDataURL("image/png"));
      setPendingMethod("draw");
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);
    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
  }, [mode]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawnRef.current = false;
    setPending(null);
  }

  // ── Upload ───────────────────────────────────────────────────────────────
  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setProcessing(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });

      // Processed server side and shown back before it is committed: background
      // removal is a threshold, and nobody should discover what their signature
      // looks like after it is on a contract.
      const res = await fetch("/api/admin/settings/signature/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "That image could not be processed.");
      setPending(json.image);
      setPendingMethod("upload");
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : "That image could not be processed.");
    } finally {
      setProcessing(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          title: title.trim(),
          ...(pending ? { image: pending, method: toMethod(pendingMethod) } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save.");

      const fresh = await fetch("/api/admin/settings/signature").then((r) => r.json());
      setState(fresh);
      setPending(null);
      clearCanvas();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSignature() {
    if (!await confirm({
      title: "Remove your signature?",
      message: "Agreements created after this will show your name as a typed signature until you add a new one. Agreements already signed are unaffected.",
      confirmLabel: "Remove",
    })) return;

    await fetch("/api/admin/settings/signature", { method: "DELETE" });
    const fresh = await fetch("/api/admin/settings/signature").then((r) => r.json());
    setState(fresh);
  }

  const dirty =
    !!pending ||
    (state ? name.trim() !== state.name || title.trim() !== state.title : false);

  if (!state) {
    return (
      <div className="px-6 py-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" />Loading…
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Your countersignature</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
          Stamped onto every agreement the moment it is created, with the date, so a client never
          opens a contract that is blank on our side. Without an image, agreements show your name
          as a typed signature.
        </p>
      </div>

      {/* Name and title */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
        <div>
          <Label htmlFor="sig-name" className="text-xs">Name as it should appear</Label>
          <Input id="sig-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Godwin" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="sig-title" className="text-xs">Title</Label>
          <Input id="sig-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lead at Brightex Solutions" className="mt-1" />
        </div>
      </div>

      {/* What is on file */}
      {state.hasSignature && state.image && !pending && (
        <div className="max-w-xl">
          <Label className="text-xs">On file</Label>
          <div className="mt-1 rounded border border-border bg-white p-4 flex items-center justify-between gap-4">
            <img src={state.image} alt="Your signature" className="max-h-16" />
            <button
              type="button"
              onClick={() => void removeSignature()}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 shrink-0"
            >
              <Trash2 size={12} />Remove
            </button>
          </div>
        </div>
      )}

      {/* Capture */}
      <div className="max-w-xl">
        <Label className="text-xs">{state.hasSignature ? "Replace it" : "Add your signature"}</Label>
        <div className="flex gap-2 mt-1 mb-2">
          {(["draw", "upload"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setPending(null); setError(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-xs font-medium transition-colors",
                mode === m
                  ? "border-brand-gold bg-brand-gold/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "draw" ? <><PenLine size={13} />Draw it</> : <><Upload size={13} />Upload a photo</>}
            </button>
          ))}
        </div>

        {mode === "draw" ? (
          <div>
            <canvas
              ref={setupCanvas}
              width={1000}
              height={320}
              className="w-full h-[150px] bg-white border border-border rounded cursor-crosshair touch-none block"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground">Sign with your mouse, trackpad or finger.</span>
              <button type="button" onClick={clearCanvas} className="text-[11px] text-muted-foreground hover:text-foreground underline">
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="w-full text-xs text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              Sign on plain white paper and photograph it in good light. The paper is removed
              automatically and you see the result before it is saved.
            </p>
          </div>
        )}

        {processing && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />Removing the background…
          </p>
        )}

        {pending && (
          <div className="mt-3">
            <Label className="text-xs">How it will appear</Label>
            <div className="mt-1 rounded border border-border bg-white p-4">
              <img src={pending} alt="Signature preview" className="max-h-16" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-start gap-1.5 max-w-xl">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? "Saving…" : "Save signature"}
        </button>
        {saved && !dirty && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <Check size={12} />Saved. New agreements will carry it.
          </span>
        )}
      </div>
    </div>
  );
}
