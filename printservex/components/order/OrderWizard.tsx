"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { checkFile, isImage, readPageCount } from "@/lib/files";
import { EMPTY_DETAILS, validateDetails, type CustomerDetails, type DetailsErrors } from "@/lib/order-details";
import { priceOrder, type Prices, type PrintOptions } from "@/lib/price";
import { defaultDetails, multiFile, type LineDetails, type Service } from "@/lib/services";
import { UPLOAD_RULES } from "@/lib/shop";
import { DetailsStep } from "./DetailsStep";
import { FilesStep } from "./FilesStep";
import { OrderHeader } from "./OrderHeader";
import { MobileOrderBar, PriceSummary, type SummaryAction } from "./PriceSummary";
import { ReviewStep } from "./ReviewStep";
import { ServiceStep } from "./ServiceStep";
import { findService, lineInput, STEPS, type Catalog, type OrderLine } from "./types";

type OrderWizardProps = Catalog & {
  prices: Prices;
  // "customer" = full-page form at /order · "staff" = Walk-in order inside the staff portal
  variant: "customer" | "staff";
  // Saves the order. Returns an error message to show, or null when it worked.
  onSubmit: (order: { details: CustomerDetails; lines: OrderLine[]; catalog: Catalog }) => Promise<string | null>;
};

const STAFF_STEPS = ["Customer", "Service", "Files & options", "Review"];
// Business rule: up to 10 items (lines) per order, each with at most one file
const MAX_LINES = UPLOAD_RULES.maxFilesPerOrder;

/**
 * The 4-step new order form, used by customers (C2) and by staff for walk-ins (S5).
 * Steps: 0 = Your details, 1 = Service, 2 = Files & options, 3 = Review.
 */
export function OrderWizard({ sizes, types, categories, services, prices, variant, onSubmit }: OrderWizardProps) {
  const catalog = useMemo(() => ({ sizes, types, categories, services }), [sizes, types, categories, services]);
  const isStaff = variant === "staff";
  // Business rule: customers must accept the privacy notice; staff ask walk-in customers in person
  const rulesOpt = { requireConsent: !isStaff };
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const [details, setDetails] = useState<CustomerDetails>(EMPTY_DETAILS);
  const [detailsErrors, setDetailsErrors] = useState<DetailsErrors>({});
  const [chosen, setChosen] = useState<string[]>([]); // service ids, in the order they were added
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string[]>>({});
  const [triedFiles, setTriedFiles] = useState(false); // show what's missing after "Review order"
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const defaultSizeId = (sizes.find((s) => s.name.toLowerCase() === "a4") ?? sizes[0])?.id ?? "";
  const sizeIds = useMemo(() => sizes.map((s) => s.id), [sizes]);
  const minPagePrice = prices.rules.length > 0 ? Math.min(...prices.rules.map((r) => r.pricePerPage)) : null;

  // Default print options for a new document: A4 if the shop has it, first paper type, B&W, 1 copy
  const defaultOptions = useCallback(
    (pages: number, service: Service): PrintOptions => ({
      sizeId: defaultSizeId,
      typeId: types[0]?.id ?? "",
      color: service.defaults.color === true,
      pages,
      copies: 1,
      binding: false,
      lamination: false,
    }),
    [defaultSizeId, types],
  );

  const newLine = (service: Service, file: File | null): OrderLine => ({
    id: crypto.randomUUID(),
    serviceId: service.id,
    file,
    // Only documents need reading (to count pages); everything else is ready right away
    status: service.kind === "document" && file ? "reading" : "ready",
    progress: 0,
    pagesDetected: null,
    options: defaultOptions(1, service),
    details: defaultDetails(service, defaultSizeId),
  });

  // ---------- Moving between steps ----------
  // The step lives in the URL (/order?step=2), so the phone's Back button goes to the previous step.
  // goTo() adds a history entry; Next.js updates useSearchParams when the URL changes.
  const goTo = (next: number) => window.history.pushState(null, "", next === 0 ? pathname : `${pathname}?step=${next}`);

  // ---------- Services (step 2) ----------
  const full = lines.length >= MAX_LINES;

  const addService = (service: Service) => {
    if (chosen.includes(service.id) || full) return;
    setChosen((all) => [...all, service.id]);
    // One-file services get their single line now; upload services get a line per file later
    if (!multiFile(service)) setLines((all) => [...all, newLine(service, null)]);
  };

  const removeService = (serviceId: string) => {
    setChosen((all) => all.filter((id) => id !== serviceId));
    setLines((all) => all.filter((l) => l.serviceId !== serviceId));
    setFileErrors((all) => {
      const next = { ...all };
      delete next[serviceId];
      return next;
    });
  };

  // ---------- Files and options (step 3) ----------
  const updateLine = (id: string, patch: Partial<OrderLine>) => setLines((all) => all.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addFiles = (serviceId: string, picked: File[]) => {
    const service = findService(catalog, serviceId);
    if (!service) return;
    const errors: string[] = [];
    const accepted: OrderLine[] = [];
    let room = MAX_LINES - lines.length;

    for (const file of picked) {
      const problem = checkFile(file, service);
      if (problem) {
        errors.push(problem);
      } else if (room <= 0) {
        errors.push(`${file.name} wasn't added. An order can have up to ${MAX_LINES} items.`);
      } else {
        room--;
        accepted.push(newLine(service, file));
      }
    }

    setFileErrors((all) => ({ ...all, [serviceId]: errors }));
    setLines((all) => [...all, ...accepted]);

    // Count pages of each new document, showing progress while it reads
    for (const line of accepted) {
      if (line.status !== "reading" || !line.file) continue;
      const file = line.file;
      readPageCount(file, (progress) => updateLine(line.id, { progress })).then((pages) =>
        setLines((all) =>
          all.map((l) =>
            l.id === line.id
              ? { ...l, status: "ready", progress: 100, pagesDetected: pages, options: { ...l.options, pages: pages ?? (isImage(file.name) ? 1 : l.options.pages) } }
              : l,
          ),
        ),
      );
    }
  };

  // Attach or remove the single file of a one-file service
  const setLineFile = (lineId: string, file: File | null) => {
    const line = lines.find((l) => l.id === lineId);
    const service = line && findService(catalog, line.serviceId);
    if (!line || !service) return;
    const problem = file ? checkFile(file, service) : null;
    setFileErrors((all) => ({ ...all, [service.id]: problem ? [problem] : [] }));
    if (!problem) updateLine(lineId, { file });
  };

  const changeOptions = (id: string, patch: Partial<PrintOptions>) =>
    setLines((all) => all.map((l) => (l.id === id ? { ...l, options: { ...l.options, ...patch } } : l)));
  const changeDetails = (id: string, patch: Partial<LineDetails>) =>
    setLines((all) => all.map((l) => (l.id === id ? { ...l, details: { ...l.details, ...patch } } : l)));
  const removeLine = (id: string) => setLines((all) => all.filter((l) => l.id !== id));

  // ---------- Live price ----------
  // Lines of services that were removed from the catalog are ignored (they can't be submitted)
  const priced = lines.flatMap((l) => {
    const service = findService(catalog, l.serviceId);
    return service && l.status === "ready" ? [lineInput(l, service)] : [];
  });
  const totals = priceOrder(prices, priced, sizeIds);

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

  const serviceHint = chosen.length === 0 ? "Add at least one service to continue." : undefined;
  const emptyUpload = chosen.map((id) => findService(catalog, id)).find((s) => s && multiFile(s) && !lines.some((l) => l.serviceId === s.id));
  const reading = lines.some((l) => l.status === "reading");
  const filesHint =
    serviceHint ??
    (emptyUpload
      ? `Add a file for ${emptyUpload.name}, or remove it.`
      : reading
        ? "Wait for your files to finish checking."
        : totals.invalidCount > 0
          ? "Fix the items marked in red to continue."
          : undefined);

  // Business rule: a step can only be shown once the steps before it are complete
  // (e.g. after a page refresh the browser forgets the form, so we go back to step 1)
  const requested = Number(searchParams.get("step") ?? 0);
  const detailsDone = Object.keys(validateDetails(details, rulesOpt)).length === 0;
  const step = !detailsDone || requested < 1 ? 0 : requested < 2 || serviceHint ? 1 : requested < 3 || filesHint ? 2 : 3;

  // After a step change: scroll to the top and move keyboard/screen-reader focus to the new title
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step]);

  const reviewOrder = () => {
    if (!filesHint) return goTo(3);
    // Show what's missing on each card, and jump to the first one
    setTriedFiles(true);
    requestAnimationFrame(() => document.querySelector<HTMLElement>("[role=alert]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const submit = async () => {
    setSubmitting(true); // stops a double tap from sending the order twice
    const error = await onSubmit({ details, lines, catalog });
    if (error) {
      // Nothing was saved: let the customer try again
      setSubmitting(false);
      toast({ kind: "error", message: error });
    }
  };

  const actions: SummaryAction[] = [
    {
      label: "Continue to service",
      onClick: continueFromDetails,
      disabled: !isStaff && !details.consent,
      hint: "Check the privacy box to continue.",
    },
    { label: "Continue to files & options", onClick: () => goTo(2), disabled: Boolean(serviceHint), hint: serviceHint },
    // Not disabled for missing options: pressing it shows what's missing on each card
    { label: "Review order", onClick: reviewOrder, disabled: Boolean(serviceHint) || reading, hint: filesHint },
    { label: submitting ? "Submitting…" : isStaff ? "Create order" : "Submit order", onClick: submit, disabled: submitting },
  ];
  const backLabels = ["", "Back to details", "Back to services", "Back to files & options"];
  const back = step > 0 ? { label: backLabels[step], onClick: () => window.history.back() } : undefined;

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
      {step === 1 && <ServiceStep catalog={catalog} chosen={chosen} minPagePrice={minPagePrice} full={full} onAdd={addService} onRemove={removeService} />}
      {step === 2 && (
        <FilesStep
          chosen={chosen}
          lines={lines}
          errors={fileErrors}
          catalog={catalog}
          prices={prices}
          showProblems={triedFiles}
          onAddFiles={addFiles}
          onLineFile={setLineFile}
          onChangeOptions={changeOptions}
          onChangeDetails={changeDetails}
          onRemoveLine={removeLine}
          onRemoveService={removeService}
        />
      )}
      {step === 3 && <ReviewStep details={details} chosen={chosen} lines={lines} totals={totals} catalog={catalog} prices={prices} onEdit={goTo} />}
    </>
  );

  const summary = (compact: boolean) => (
    <PriceSummary compact={compact} chosen={chosen} lines={lines} catalog={catalog} totals={totals} prices={prices} primary={actions[step]} back={back} />
  );

  // Staff: compact version inside the staff layout (desktop only, no phone header or bottom bar)
  if (isStaff) {
    return (
      <>
        <div className="flex items-center justify-between gap-8">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl outline-none">
            Walk-in order
          </h1>
          <Stepper steps={STAFF_STEPS} current={step} className="w-[640px]" />
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-3">{stepContent}</div>
          {summary(true)}
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <OrderHeader step={step} onBack={() => window.history.back()} />

      <main id="main" className="mx-auto grid w-full max-w-[1120px] flex-1 items-start gap-8 px-4 pb-44 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-0 lg:py-10">
        <div className="flex min-w-0 flex-col gap-5 lg:gap-4">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={`text-2xl tracking-[-0.015em] outline-none lg:text-3xl ${step > 0 ? "max-lg:sr-only" : ""}`}
          >
            {STEPS[step]}
          </h1>
          {stepContent}
        </div>

        {summary(false)}
      </main>

      <MobileOrderBar itemCount={lines.length} totals={totals} primary={actions[step]} showTotal={step > 1} />
    </div>
  );
}
