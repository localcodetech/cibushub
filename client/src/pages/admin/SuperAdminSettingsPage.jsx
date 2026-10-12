import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert, CircleCheck } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import Card from "@/components/common/Card";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import { getPlatformSettingsRequest, updatePlatformSettingsRequest } from "@/api/superAdmin";
import {
  PAYMENT_METHOD_NAMES,
  SETTING_GROUPS,
  SETTINGS_BY_KEY,
  formatSettingValue,
  settingLabel,
} from "@/data/settingLabels";
import { formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";

// ─────────────────────────────────────────────
// Form rules: the same limits as the server [AC-SADM-02]
// ─────────────────────────────────────────────

// "5.50" -> 550. Typed in cedis, always sent as whole pesewas [AC-GLOBAL-08].
const toPesewas = (text) => Math.round(Number(text) * 100);

const moneyField = (max) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 5.00")
    .refine((text) => toPesewas(text) <= max, "At most " + formatMoney(max));

const wholeNumberField = (min, max, unit) =>
  z
    .number({ error: "Enter a number" })
    .int("Use a whole number")
    .min(min, "At least " + min + " " + unit)
    .max(max, "At most " + max + " " + unit);

// One rule per setting, built from the list in data/settingLabels.js
const settingRules = Object.fromEntries(
  Object.values(SETTINGS_BY_KEY).map((setting) => [
    setting.key,
    setting.unit === "money"
      ? moneyField(setting.max)
      : wholeNumberField(setting.min, setting.max, setting.unit),
  ]),
);

const settingsFormSchema = z
  .object({
    ...settingRules,
    reason: z
      .string()
      .trim()
      .min(10, "Give a clear reason (at least 10 characters)")
      .max(500, "Reason is too long"),
  })
  // A wider second search must really be wider
  .refine((values) => values.widenedRadiusKm >= values.searchRadiusKm, {
    path: ["widenedRadiusKm"],
    message: "Must be at least the first search radius",
  });

// The server's values -> what the boxes show (money as "5.00")
const toFormValues = (values) => {
  const formValues = { reason: "" };
  Object.values(SETTINGS_BY_KEY).forEach((setting) => {
    const value = values[setting.key];
    formValues[setting.key] = setting.unit === "money" ? (value / 100).toFixed(2) : value;
  });
  return formValues;
};

// ─────────────────────────────────────────────
// The page
// ─────────────────────────────────────────────

// /admin/settings: super admins only. Fees, commission, rider search and time limits.
// A save makes a new version: new orders use it at once, placed orders keep their own
// fees [AC-SADM-02, AC-SADM-03].
const SuperAdminSettingsPage = () => {
  const queryClient = useQueryClient();
  // Shown after a save; kept here because the form starts fresh with the new version
  const [savedVersion, setSavedVersion] = useState(null);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["super-admin-settings"],
    queryFn: getPlatformSettingsRequest,
  });

  const handleSaved = async (version) => {
    setSavedVersion(version);
    await queryClient.invalidateQueries({ queryKey: ["super-admin-settings"] });
  };

  return (
    <Container>
      <section className="mx-auto max-w-3xl py-8">
        <Heading level={1}>Platform settings</Heading>
        <Text muted className="mt-1">
          Changes apply to new orders at once. Orders already placed keep their fees.
        </Text>

        <div className="mt-6">
          {isPending && <Skeleton className="h-96 w-full" />}
          {error && <ErrorState message={error.message} onRetry={refetch} />}
          {data && (
            <>
              {savedVersion && (
                <Card
                  role="status"
                  tone="highlight"
                  padding="sm"
                  className="mb-4 flex items-start gap-2 text-[15px]"
                >
                  <CircleCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>Saved. Version {savedVersion} is now in force for new orders.</span>
                </Card>
              )}
              {/* key: a new version starts a fresh form with its values */}
              <SettingsForm
                key={data.version}
                values={data.values}
                onSaved={handleSaved}
                onEdit={() => setSavedVersion(null)}
              />
              <SettingsHistory history={data.history} />
            </>
          )}
        </div>
      </section>
    </Container>
  );
};

// ─────────────────────────────────────────────
// The form
// ─────────────────────────────────────────────

const SettingsForm = ({ values, onSaved, onEdit }) => {
  const [rootError, setRootError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(settingsFormSchema),
    mode: "onTouched",
    defaultValues: toFormValues(values),
  });

  const onSubmit = async (formValues) => {
    setRootError("");

    // Send only what really changed, money back in pesewas
    const changes = {};
    Object.values(SETTINGS_BY_KEY).forEach((setting) => {
      const typed = formValues[setting.key];
      const value = setting.unit === "money" ? toPesewas(typed) : typed;
      if (value !== values[setting.key]) {
        changes[setting.key] = value;
      }
    });
    if (Object.keys(changes).length === 0) {
      setRootError("Nothing has changed.");
      return;
    }

    try {
      const updated = await updatePlatformSettingsRequest(changes, formValues.reason);
      await onSaved(updated.version);
    } catch (error) {
      if (error.details && error.details.length > 0) {
        // The server names fields "settings.commissionPercent"; the boxes are "commissionPercent"
        error.details.forEach((detail) => {
          const field = detail.field.replace(/^settings\.?/, "");
          if (field in SETTINGS_BY_KEY || field === "reason") {
            setError(field, { message: detail.message });
          } else {
            setRootError(detail.message);
          }
        });
        return;
      }
      setRootError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} onChange={onEdit} noValidate className="space-y-6">
      {SETTING_GROUPS.map((group) => (
        <Card as="fieldset" key={group.title}>
          <legend className="px-1 font-bold">{group.title}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.settings.map((setting) => {
              const isMoney = setting.unit === "money";
              return (
                <FormField
                  key={setting.key}
                  id={"setting-" + setting.key}
                  label={setting.label + (isMoney ? " (GHS)" : " (" + setting.unit + ")")}
                  hint={setting.hint}
                  type={isMoney ? "text" : "number"}
                  inputMode={isMoney ? "decimal" : "numeric"}
                  error={errors[setting.key]?.message}
                  {...register(setting.key, { valueAsNumber: !isMoney })}
                />
              );
            })}
          </div>
        </Card>
      ))}

      {/* Only Paystack exists until cash on delivery is built, so nothing to choose yet */}
      <Card>
        <p className="font-bold">Ways to pay</p>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {values.paymentMethods.map((method) => PAYMENT_METHOD_NAMES[method]).join(", ")}. Cash on
          delivery comes later.
        </p>
      </Card>

      <div>
        <label htmlFor="settings-reason" className="text-[15px] font-bold">
          Why are you changing this?
        </label>
        <p id="settings-reason-hint" className="mt-1 text-[13px] text-muted-foreground">
          Kept in the history and the audit log.
        </p>
        <textarea
          id="settings-reason"
          rows={3}
          maxLength={500}
          aria-invalid={errors.reason ? true : false}
          aria-describedby={errors.reason ? "settings-reason-error" : "settings-reason-hint"}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          {...register("reason")}
        />
        {errors.reason && (
          <p id="settings-reason-error" className="mt-1 text-[15px] text-destructive">
            {errors.reason.message}
          </p>
        )}
      </div>

      {rootError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
        >
          <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{rootError}</span>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full font-bold sm:w-auto">
        {isSubmitting ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
};

// ─────────────────────────────────────────────
// The history: who changed what, when and why
// ─────────────────────────────────────────────

// The server sends at most this many versions
const HISTORY_SIZE = 20;

// history is newest first; each version is compared with the one before it
const SettingsHistory = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <section className="mt-10">
      <Heading level={2}>History</Heading>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
        {history.map((entry, index) => {
          const previous = history[index + 1];
          const changedKeys = previous
            ? Object.keys(entry.values).filter(
                (key) => JSON.stringify(entry.values[key]) !== JSON.stringify(previous.values[key]),
              )
            : [];
          return (
            <li key={entry.version} className="px-4 py-3">
              <p className="font-bold">
                Version {entry.version}
                {index === 0 && <span className="font-normal text-primary"> · in force</span>}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {formatDateTime(entry.changedAt)} · {entry.changedBy || "System"}
              </p>
              {previous ? (
                <ul className="mt-1 text-[15px]">
                  {changedKeys.map((key) => (
                    <li key={key}>
                      {settingLabel(key)}: {formatSettingValue(key, previous.values[key])} →{" "}
                      <span className="font-bold">
                        {formatSettingValue(key, entry.values[key])}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[15px]">
                  {history.length < HISTORY_SIZE ? "Starting values" : "Older versions not shown"}
                </p>
              )}
              {entry.reason && <p className="mt-1 text-[15px] italic">“{entry.reason}”</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SuperAdminSettingsPage;
