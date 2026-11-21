import { AUTHOR_NAME, BUILD_DATE, BUILD_ID, copyrightYears } from '../../config/appInfo';

/** İmza ve telif satırı. `showBuild`: testçinin hata bildirirken yazacağı sürüm. */
export default function AppFooter({ showBuild = false }) {
  return (
    <footer className="text-center space-y-0.5 py-2" style={{ color: 'var(--text-subtle)' }}>
      <p className="text-[11px] font-semibold">Created by {AUTHOR_NAME}</p>
      <p className="text-[11px] font-medium">© {copyrightYears()} · Tüm hakları saklıdır.</p>
      {showBuild && (
        <p className="text-[10px] font-medium tabular-nums opacity-80">
          Sürüm {BUILD_ID}
          {BUILD_DATE && ` · ${BUILD_DATE}`}
        </p>
      )}
    </footer>
  );
}
