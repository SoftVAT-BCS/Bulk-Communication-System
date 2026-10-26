"use client";
import { BcsPortalDatabase } from './bcs-portal-database';
import { BcsColumnMapping } from './bcs-column-mapping';
import { BcsSesSettings } from './bcs-ses-settings';
import { BcsUserRights } from './bcs-user-rights';

export function BcsConfigurationPanels({ tab }: { tab: string }) {
  switch (tab) {
    case 'Portal & Database': return <BcsPortalDatabase/>;
    case 'Table & Column Mapping': return <BcsColumnMapping/>;
    case 'Amazon SES': return <BcsSesSettings/>;
    case 'User Rights': return <BcsUserRights/>;
    default: return <p role="alert">Unknown configuration section.</p>;
  }
}
