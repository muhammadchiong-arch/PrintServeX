"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Stepper } from "@/components/ui/Stepper";
import { checkFile, readPageCount } from "@/lib/files";
import { EMPTY_DETAILS, validateDetails, type CustomerDetails, type DetailsErrors } from "@/lib/order-details";
import { priceOrder, type PriceRule, type PrintOptions } from "@/lib/price";
import { UPLOAD_RULES } from "@/lib/shop";
import { DetailsStep } from "./DetailsStep";
import { FilesStep } from "./FilesStep";
import { OrderHeader } from "./OrderHeader";
import { MobileOrderBar, PriceSummary, type SummaryAction } from "./PriceSummary";
import { ReviewStep } from "./ReviewStep";
import { buildOrderDraft, type OrderDraft } from "./build-order";
import { STEPS, type Catalog, type OrderFile } from "./types";

type OrderWizardProps = Catalog & {
  rules: PriceRule[];
  // "customer" = full-page form at /order · "staff" = Walk-in order inside the staff portal
  variant: "customer" | "staff";
  onSubmit: (draft: OrderDraft) => void;
};

const STAFF_STEPS = ["Customer", "Files & options", "Review"];

/**
 * The 3-step new order form, used by customers (C2) and by staff for walk-ins (S5).
 * Steps: 0 = Your details, 1 = Files & options, 2 = Review.
 */
export function OrderWizard({ sizes, types, rules, variant, onSubmit }: OrderWizardProps) {
  const catalog = useMemo(() => ({ sizes, types }), [sizes, types]);
  const isStaff = variant === "staff";
  // Business rule: customers must accept the privacy notice; staff ask walk-in customers in person
  const rulesOpt = { requireConsent: !isStaff };
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<CustomerDetails>(EMPTY_DETAILS);
  const [detailsErrors, setDetailsErrors] = useState<DetailsErrors>({});
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Default options for a new file: A4 if the shop has it, first paper type, B&W, 1 copy
  const defaultOptions = useCallback(
    (pages: number): PrintOptions => ({
      sizeId: (sizes.find((s) => s.name.toLowerCase() === "a4") ?? sizes[0])?.id ?? "",
      typeId: types[0]?.id ?? "",
      color: false,
      pages,
      copies: 1,
      binding: false,
      lamination: false,
    }),
    [sizes, types],
  );

  // ---------- Moving between steps ----------
  // The step lives in the URL (/order?step=2), so the phone's Back button goes to the previous step.
  // goTo() adds a history entry; Next.js updates useSearchParams when the URL changes.
  const goTo = (next: number) => window.history.pushState(null, "", next === 0 ? pathname : `${pathname}?step=${next}`);

  // ---------- Files ----------
  const updateFile = (id: string, patch: Partial<OrderFile>) =>
    setFiles((all) => all.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addFiles = (picked: File[]) => {
    const errors: string[] = [];
    const accepted: OrderFile[] = [];
    let room = UPLOAD_RULES.maxFilesPerOrder - files.length;

    for (const file of picked) {
      const problem = checkFile(file);
      if (problem) {
        errors.push(problem);
      } else if (room <= 0) {
        errors.push(`${file.name} wasn't added. You can send up to ${UPLOAD_RULES.maxFilesPerOrder} files per order.`);
      } else {
        room--;
        accepted.push({ id: crypto.randomUUID(), file, status: "reading", progress: 0, pagesDetected: null, options: defaultOptions(1) });
      }
    }

    setFileErrors(errors);
    setFiles((all) => [...all, ...accepted]);

    // Count pages for each new file, showing progress while it reads
    for (const item of accepted) {
      readPageCount(item.file, (progress) => updateFile(item.id, { progress })).then((pages) =>
        setFiles((all) =>
          all.map((f) =>
            f.id === item.id ? { ...f, status: "ready", progress: 100, pagesDetected: pages, options: { ...f.options, pages: pages ?? 1 } } : f,
          ),
        ),
      );
    }
  };

  const changeFileOptions = (id: string, patch: Partial<PrintOptions>) =>
    setFiles((all) => all.map((f) => (f.id === id ? { ...f, options: { ...f.options, ...patch } } : f)));

  const removeFile = (id: string) => setFiles((all) => all.filter((f) => f.id !== id));

  // ---------- Live price ----------
  const readyFiles = files.filter((f) => f.status === "ready");
  const totals = priceOrder(rules, readyFiles.map((f) => f.options));

  // ---------- Main button for each step ----------
  const continueFromDetails = () => {
    const errors = validateDetails(details, rulesOpt);
    setDetailsErrors(errors);
    const firstBad = (["name", "phone", "email"] as const).find((k) => errors[k]);
    if (firstBad) {
      document.getElementById(firstBad)?.focus();
      return;
    }
    if (!errors.consent) goTo(1);
  };

  const filesHint =
    files.length === 0
      ? "Add at least one file to continue."
      : readyFiles.length < files.length
        ? "Wait for your files to finish checking."
        : totals.hasUnpricedFile
          ? "Change the options marked in red to continue."
          : undefined;

  // Business rule: a step can only be shown once the steps before it are complete
  // (e.g. after a page refresh the browser forgets the form, so we go back to step 1)
  const requested = Number(searchParams.get("step") ?? 0);
  const detailsDone = Object.keys(validateDetails(details, rulesOpt)).length === 0;
  const step = !detailsDone || requested < 1 ? 0 : requested >= 2 && !filesHint ? 2 : 1;

  // After a step change: scroll to the top and move keyboard/screen-reader focus to the new title
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step]);

  const submit = () => {
    setSubmitting(true); // stops a double tap from sending the order twice
    onSubmit(buildOrderDraft(details, readyFiles, catalog, rules));
  };

  const actions: SummaryAction[] = [
    {
      label: "Continue to files",
      onClick: continueFromDetails,
      disabled: !isStaff && !details.consent,
      hint: "Check the privacy box to continue.",
    },
    { label: "Review order", onClick: () => goTo(2), disabled: Boolean(filesHint), hint: filesHint },
    { label: submitting ? "Submitting…" : isStaff ? "Create order" : "Submit order", onClick: submit, disabled: submitting },
  ];
  const back = step === 1 ? { label: "Back to details", onClick: () => window.history.back() } : step === 2 ? { label: "Back to files", onClick: () => window.history.back() } : undefined;

  const stepContent = (
    <>
      {step === 0 && (
        <DetailsStep
          variant={variant}
          details={details}
          errors={detailsErrors}
          onChange={(patch) => {
            setDetails((d) => ({ ...d, ...patch }));
            // Clear an error as soon as the customer fixes that field
            setDetailsErrors((e) => {
              const next = { ...e };
              for (const k of Object.keys(patch) as (keyof CustomerDetails)[]) delete next[k];
              return next;
            });
          }}
        />
      )}
      {step === 1 && (
        <FilesStep
          files={files}
          errors={fileErrors}
          catalog={catalog}
          rules={rules}
          onAddFiles={addFiles}
          onChangeFile={changeFileOptions}
          onRemoveFile={removeFile}
        />
      )}
      {step === 2 && <ReviewStep details={details} files={readyFiles} totals={totals} catalog={catalog} rules={rules} onEdit={goTo} />}
    </>
  );

  // Staff: compact version inside the staff layout (desktop only, no phone header or bottom bar)
  if (isStaff) {
    return (
      <>
        <div className="flex items-center justify-between gap-8">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl outline-none">
            Walk-in order
          </h1>
          <Stepper steps={STAFF_STEPS} current={step} className="w-[520px]" />
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-3">{stepContent}</div>
          <PriceSummary compact files={files} totals={totals} rules={rules} primary={actions[step]} back={back} />
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <OrderHeader step={step} onBack={() => window.history.back()} />

      <main id="main" className="mx-auto grid w-full max-w-[1120px] flex-1 items-start gap-8 px-4 pb-44 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-0 lg:py-10">
        <div className="flex flex-col gap-5 lg:gap-4">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={`text-2xl tracking-[-0.015em] outline-none lg:text-3xl ${step > 0 ? "max-lg:sr-only" : ""}`}
          >
            {STEPS[step]}
          </h1>
          {stepContent}
        </div>

        <PriceSummary files={files} totals={totals} rules={rules} primary={actions[step]} back={back} />
      </main>

      <MobileOrderBar fileCount={readyFiles.length} totals={totals} primary={actions[step]} showTotal={step > 0} />
    </div>
  );
}
