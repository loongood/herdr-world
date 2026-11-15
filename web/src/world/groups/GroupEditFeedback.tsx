import { useT } from "../../i18n";

export function GroupEditFeedback({
  error,
  changed,
  current,
  onReview,
}: {
  error: string | null;
  changed: boolean;
  current: string;
  onReview(): void;
}) {
  const t = useT();
  return (
    <>
      {error && (
        <p role="alert" className="group-error">
          {error}
        </p>
      )}
      {changed && (
        <div className="group-hint">
          <p>{t("groups.feedbackChanged", { current })}</p>
          <button type="button" onClick={onReview}>
            {t("groups.useCurrentVersion")}
          </button>
          <p>{t("groups.draftKept")}</p>
        </div>
      )}
    </>
  );
}
