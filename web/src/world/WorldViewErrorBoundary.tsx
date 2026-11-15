import { Component, type ReactNode } from "react";
import { t } from "../i18n";

export class WorldViewErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="world-view-failure" role="alert">
          <h2>{t("world.viewFailed")}</h2>
          <p>{t("world.viewFailedBody")}</p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
          >
            {t("world.retryView")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
