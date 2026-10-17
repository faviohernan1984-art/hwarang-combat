import CinematicAdaptiveShell from './CinematicAdaptiveShell.jsx';
import './CommercialProductMobile.css';

// Opt-in only for NOVA, PULSAR and DISCOVER product routes. CSS changes layout
// without replacing the React subtree, preserving selections on rotation.
export default function CommercialProductFrame({ children, mobileEnabled = true }) {
  if (!mobileEnabled) return <CinematicAdaptiveShell>{children}</CinematicAdaptiveShell>;
  return <div className="hsu-product-mobile"><CinematicAdaptiveShell>{children}</CinematicAdaptiveShell></div>;
}
