/**
 * The single demo identity every development script sends to.
 *
 * Real client correspondence goes out from the dashboard, by a human, after
 * looking at it. Scripts do not send to real clients, and there is deliberately
 * no flag, override or environment variable that lets them: the safeguard that
 * can be switched off is the one that eventually is.
 *
 * gbrown is Godwin's own account, so anything a script sends lands with the
 * person running it. `resolveCc` additionally copies Brightex through gbrown's
 * client_contacts row (cc_scopes = ['all']), which exercises the real CC
 * routing rather than bypassing it.
 */
export const DEMO_CLIENT_EMAIL = "gbrownze@gmail.com";
export const DEMO_CLIENT_NAME = "Godwin Brown Ochieng";

/**
 * Throws if a script is about to send anywhere other than the demo account.
 *
 * Call this immediately before any sendMail in a script. It exists because the
 * cost of the mistake is asymmetric: a preview that fails to send is a minor
 * annoyance, and a half-finished proposal reaching a real client is not.
 */
export function assertDemoRecipient(to: string): void {
  if (to.trim().toLowerCase() !== DEMO_CLIENT_EMAIL) {
    throw new Error(
      `Refusing to send to ${to}. Scripts only ever send to the demo account ` +
      `(${DEMO_CLIENT_EMAIL}). Send to real clients from the dashboard.`
    );
  }
}
