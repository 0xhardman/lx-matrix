"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; twitter: string }
  | { kind: "error"; message: string };

const DIRECTIONS = ["Web3", "AI", "技术", "投研"];
const FREQUENCIES = ["日更", "周更", "不定期"];

const inputClass =
  "mt-2 w-full rounded-[5px] border border-divider bg-background px-4 py-3 text-base outline-none transition-colors focus:border-foreground";
const labelClass = "block text-sm font-semibold text-foreground";
const hintClass = "mt-1.5 text-xs text-muted";

export function RegisterForm() {
  const [twitter, setTwitter] = useState("");
  const [wechat, setWechat] = useState("");
  const [hasBlueV, setHasBlueV] = useState<boolean | null>(null);
  const [isLxdaoMember, setIsLxdaoMember] = useState<boolean | null>(null);
  const [lxdaoProof, setLxdaoProof] = useState("");
  const [directions, setDirections] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("");
  const [intro, setIntro] = useState("");
  const [referrer, setReferrer] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function toggleDirection(d: string) {
    setDirections((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function reset() {
    setTwitter("");
    setWechat("");
    setHasBlueV(null);
    setIsLxdaoMember(null);
    setLxdaoProof("");
    setDirections([]);
    setFrequency("");
    setIntro("");
    setReferrer("");
    setStatus({ kind: "idle" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitter,
          wechat,
          hasBlueV,
          isLxdaoMember,
          lxdaoProof,
          directions,
          frequency,
          intro,
          referrer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "提交失败" });
        return;
      }
      setStatus({ kind: "success", twitter: data.twitter });
    } catch {
      setStatus({ kind: "error", message: "网络错误，请稍后再试" });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="rounded-xl border border-divider bg-background p-8 text-center shadow-[0_4px_24px_var(--card-shadow)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20 text-3xl">
          💗
        </div>
        <h2 className="mt-5 text-2xl font-bold">申请已提交！</h2>
        <p className="mt-3 leading-relaxed text-muted">
          已收到{" "}
          <span className="font-semibold text-foreground">
            {status.twitter}
          </span>{" "}
          的申请，我们会尽快 review。通过后会通过微信与你联系 💗
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md border border-divider bg-background px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-alternate-dark"
        >
          再填一份
        </button>
      </div>
    );
  }

  const submitting = status.kind === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-divider bg-background p-6 shadow-[0_4px_24px_var(--card-shadow)] sm:p-8"
    >
      <div className="space-y-7">
        {/* Twitter */}
        <div>
          <label htmlFor="twitter" className={labelClass}>
            Twitter 账号 <span className="text-red-500">*</span>
          </label>
          <input
            id="twitter"
            type="text"
            required
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="@yourhandle 或 https://x.com/yourhandle"
            className={inputClass}
          />
          <p className={hintClass}>填 @用户名 或直接粘贴主页链接都可以。</p>
        </div>

        {/* WeChat */}
        <div>
          <label htmlFor="wechat" className={labelClass}>
            微信名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="wechat"
            type="text"
            required
            maxLength={64}
            value={wechat}
            onChange={(e) => setWechat(e.target.value)}
            placeholder="你的微信昵称"
            className={inputClass}
          />
          <p className={hintClass}>通过后方便拉群对接，建议填群内显示的名字。</p>
        </div>

        {/* Blue V */}
        <div>
          <span className={labelClass}>
            是否已开通蓝V <span className="text-red-500">*</span>
          </span>
          <div className="mt-2 flex gap-3">
            <YesNo value={hasBlueV} onChange={setHasBlueV} name="bluev" />
          </div>
          <p className={hintClass}>入群硬性要求：必须有蓝V。</p>
        </div>

        {/* LXDAO member */}
        <div>
          <span className={labelClass}>
            是否 LXDAO 成员 <span className="text-red-500">*</span>
          </span>
          <div className="mt-2 flex gap-3">
            <YesNo
              value={isLxdaoMember}
              onChange={setIsLxdaoMember}
              name="lxdao"
            />
          </div>
          <p className={hintClass}>入群硬性要求：需为 LXDAO 成员。</p>
        </div>

        {/* LXDAO proof */}
        <div>
          <label htmlFor="proof" className={labelClass}>
            LXDAO 身份佐证{" "}
            <span className="font-normal text-muted">（选填）</span>
          </label>
          <input
            id="proof"
            type="text"
            value={lxdaoProof}
            onChange={(e) => setLxdaoProof(e.target.value)}
            placeholder="LXDAO 用户名 / Buidler 主页链接"
            className={inputClass}
          />
        </div>

        {/* Directions */}
        <div>
          <span className={labelClass}>
            内容方向 <span className="text-red-500">*</span>
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIRECTIONS.map((d) => {
              const active = directions.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDirection(d)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-divider bg-background text-muted hover:bg-alternate"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className={hintClass}>可多选。</p>
        </div>

        {/* Frequency */}
        <div>
          <span className={labelClass}>
            更新频率 <span className="text-red-500">*</span>
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => {
              const active = frequency === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-divider bg-background text-muted hover:bg-alternate"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <p className={hintClass}>建议日更，至少周更。</p>
        </div>

        {/* Intro */}
        <div>
          <label htmlFor="intro" className={labelClass}>
            一句话介绍 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="intro"
            required
            maxLength={500}
            rows={3}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="你主要发什么内容？方便我们判断方向是否契合。"
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* Referrer */}
        <div>
          <label htmlFor="referrer" className={labelClass}>
            推荐人 <span className="font-normal text-muted">（选填）</span>
          </label>
          <input
            id="referrer"
            type="text"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
            placeholder="谁推荐你进来的？"
            className={inputClass}
          />
          <p className={hintClass}>新成员由现有群友推荐，填上能加快审核。</p>
        </div>

        {status.kind === "error" && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "提交中…" : "提交申请"}
        </button>
      </div>
    </form>
  );
}

function YesNo({
  value,
  onChange,
  name,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <>
      {[
        { label: "是", v: true },
        { label: "否", v: false },
      ].map((opt) => {
        const active = value === opt.v;
        return (
          <button
            key={name + opt.label}
            type="button"
            onClick={() => onChange(opt.v)}
            className={`rounded-md border px-6 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-white"
                : "border-divider bg-background text-muted hover:bg-alternate"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </>
  );
}
