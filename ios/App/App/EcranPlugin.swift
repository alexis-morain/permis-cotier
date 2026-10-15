import Capacitor
import UIKit

/// Le greffon `Ecran` : `pleinEcran({ actif })`, et `onglet({ chemin })` plus bas.
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
        CAPPluginMethod(name: "pleinEcran", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "onglet", returnType: CAPPluginReturnPromise)
    ]

    /// Bascule vers l'onglet dont l'adresse de départ est `chemin`.
    ///
    /// Un lien vers la racine d'un autre onglet (« Faire un examen blanc »
    /// depuis l'Accueil) ouvrait l'écran sous l'onglet courant, et la barre ne
    /// disait plus où l'on était. Le web l'appelle par `basculerVersLOnglet()`
    /// de `src/lib/natif.ts`. L'onglet visé garde son état : un examen commencé
    /// y reste. Rend `bascule: false` si l'onglet visé est déjà l'onglet
    /// courant, ou introuvable ; le web navigue alors comme avant.
    @objc func onglet(_ call: CAPPluginCall) {
        let chemin = call.getString("chemin") ?? ""
        DispatchQueue.main.async { [weak self] in
            guard let barre = self?.bridge?.viewController?.tabBarController,
                  let ecrans = barre.viewControllers,
                  let rang = ecrans.firstIndex(where: { ($0 as? EcranWeb)?.cheminDeDepart == chemin }),
                  rang != barre.selectedIndex else {
                call.resolve(["bascule": false])
                return
            }
            barre.selectedIndex = rang
            call.resolve(["bascule": true])
        }
    }

    @objc func pleinEcran(_ call: CAPPluginCall) {
        let actif = call.getBool("actif") ?? false
        DispatchQueue.main.async { [weak self] in
            if let ecran = self?.bridge?.viewController {
                Self.basculer(dans: ecran, cachee: actif)
            }
            // Pas de barre d'onglets : rien à cacher, et rien d'anormal.
            call.resolve()
        }
    }

    /// Cache ou rend la barre d'onglets de l'écran donné. Sur le fil principal.
    /// Appelée par le greffon, et par `EcranWeb` à chaque changement d'adresse :
    /// une page quittée en pleine série ne doit jamais laisser la barre cachée.
    static func basculer(dans ecran: UIViewController, cachee: Bool) {
        guard let barre = ecran.tabBarController else { return }
        guard barre.isTabBarHidden != cachee else { return }
        // UIKit anime la barre et recalcule lui-même la zone sûre. La cible
        // est iOS 18 : le chemin d'avant, qui mesurait l'encart à la main,
        // n'a jamais tourné sur un vrai runtime, et il est parti avec elle.
        barre.setTabBarHidden(cachee, animated: true)
    }
}
