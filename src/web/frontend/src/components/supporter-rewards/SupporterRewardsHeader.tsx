import React from "react";
import { PageHeader, Button } from "../ui";

export default function SupporterRewardsHeader({ enabled, onToggle, hasChanges, onSave, saving }) {
  return (
    <PageHeader
      category="समुदाय"
      breadcrumb="Community / Engagement"
      title="Supporter Rewards"
      description="Reward members who represent the server through their Discord status or server clan identity."
      enabled={enabled}
      onToggle={onToggle}
      actions={
        onSave && (
          <Button
            variant="primary"
            onClick={onSave}
            disabled={!hasChanges}
            isLoading={saving}
            loadingText="Saving..."
          >
            Save Changes
          </Button>
        )
      }
      disabledAlert={{
        title: "Supporter Rewards Disabled",
        message: "Realtime status and clan reward evaluation is currently paused. Configuration can still be edited and saved.",
      }}
    />
  );
}
