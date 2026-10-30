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
            let barre = self?.bridge?.viewController?.tabBarController as? BarreOnglets
            call.resolve(["bascule": barre?.selectionner(chemin: chemin) ?? false])
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
        if #available(iOS 18.0, *) {
            guard barre.isTabBarHidden != cachee else { return }
            // UIKit anime la barre et recalcule lui-même la zone sûre.
            barre.setTabBarHidden(cachee, animated: true)
            // Sur iPad, la barre latérale a son propre état : on la replie
            // pour l'épreuve, et on ne la rouvre que si elle était ouverte.
            if barre.mode == .tabSidebar {
                basculerBarreLaterale(barre: barre, cachee: cachee)
            }
        } else {
            guard barre.tabBar.isHidden != cachee else { return }
            basculerAvantIOS18(barre: barre, ecran: ecran, cachee: cachee)
        }
    }

    /// L'état de la barre latérale avant l'épreuve : `nil` tant qu'on ne l'a
    /// pas repliée nous-mêmes. Rouvrir une barre que la personne avait
    /// refermée serait lui reprendre la main.
    private static var lateraleOuverteAvant: Bool?

    @available(iOS 18.0, *)
    private static func basculerBarreLaterale(barre: UITabBarController, cachee: Bool) {
        if cachee {
            guard lateraleOuverteAvant == nil else { return }
            lateraleOuverteAvant = !barre.sidebar.isHidden
            barre.sidebar.isHidden = true
        } else if let ouverte = lateraleOuverteAvant {
            lateraleOuverteAvant = nil
            barre.sidebar.isHidden = !ouverte
        }
    }

    /// Avant iOS 18, cacher la barre ne rend pas toujours la place à l'écran :
    /// l'encart du bas peut garder la hauteur de la barre. On mesure l'écart
    /// avec la zone sûre de la fenêtre et on le retire par un encart négatif.
    /// Barre rendue, l'encart revient à zéro. La cible est iOS 16 : ce chemin
    /// sert aux iPhone restés en 16 ou 17, vérifié au simulateur dans les deux.
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
