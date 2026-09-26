import Capacitor
import UIKit

/// Le greffon `Ecran` : une seule méthode, `pleinEcran({ actif })`.
///
/// Elle cache la barre d'onglets pendant un examen blanc, et la rend à la fin.
/// Quarante questions sous un chrono se passent sans rien d'autre à l'écran :
/// une barre qui reste, c'est un doigt qui quitte l'épreuve par erreur. Le web
/// l'appelle par `modeConcentration()` dans `src/lib/natif.ts`.
///
/// Le point délicat est la zone sûre du bas. La webview la lit en
/// `safe-area-inset-bottom`, et la page s'en sert pour dégager ses boutons.
/// Barre montrée, l'encart vaut la barre ; barre cachée, il ne vaut plus que
/// l'indicateur d'accueil. Sinon la page garde un rembourrage vide en bas.
@objc(EcranPlugin)
public class EcranPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "Ecran"
    public let jsName = "Ecran"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pleinEcran", returnType: CAPPluginReturnPromise)
    ]

    @objc func pleinEcran(_ call: CAPPluginCall) {
        let actif = call.getBool("actif") ?? false
        DispatchQueue.main.async { [weak self] in
            guard let ecran = self?.bridge?.viewController,
                  let barre = ecran.tabBarController else {
                // Pas de barre d'onglets : rien à cacher, et rien d'anormal.
                call.resolve()
                return
            }
            if #available(iOS 18.0, *) {
                // UIKit anime la barre et recalcule lui-même la zone sûre.
                barre.setTabBarHidden(actif, animated: true)
            } else {
                Self.basculerAvantIOS18(barre: barre, ecran: ecran, cachee: actif)
            }
            call.resolve()
        }
    }

    /// Avant iOS 18, cacher la barre ne rend pas toujours la place à l'écran :
    /// l'encart du bas peut garder la hauteur de la barre. On mesure l'écart
    /// avec la zone sûre de la fenêtre et on le retire par un encart négatif.
    /// Barre rendue, l'encart revient à zéro.
    private static func basculerAvantIOS18(barre: UITabBarController,
                                           ecran: UIViewController,
                                           cachee: Bool) {
        UIView.transition(with: barre.tabBar, duration: 0.25,
                          options: .transitionCrossDissolve) {
            barre.tabBar.isHidden = cachee
        }
        ecran.additionalSafeAreaInsets = .zero
        barre.view.setNeedsLayout()
        barre.view.layoutIfNeeded()
        if cachee {
            let enTrop = ecran.view.safeAreaInsets.bottom - barre.view.safeAreaInsets.bottom
            if enTrop > 0 {
                ecran.additionalSafeAreaInsets.bottom = -enTrop
            }
        }
    }
}
