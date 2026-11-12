import Capacitor
import StoreKit
import UIKit

/// Le greffon `Note` : `demander()`.
///
/// Il ouvre la fenêtre de note d'Apple (« Vous aimez … ? », les étoiles) par
/// `SKStoreReviewController.requestReview(in:)`. C'est le système qui décide
/// de l'afficher : trois fois par an au plus par personne, jamais si la
/// personne a coupé les demandes dans les Réglages, jamais en TestFlight. Le
/// greffon résout donc toujours, fenêtre vue ou non.
///
/// Le web ne l'appelle qu'au verdict d'un examen blanc réussi, et à intervalle
/// d'au moins 120 jours (`proposerLaNote` dans
/// `src/lib/natif.ts`, `src/lib/evaluation.ts`). La même API vaut sur iPhone,
/// iPad et Mac Catalyst (disponible depuis iOS 14 et Mac Catalyst 14) : la
/// cible est iOS 16, aucun repli n'est nécessaire.
@objc(NotePlugin)
public class NotePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NotePlugin"
    public let jsName = "Note"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "demander", returnType: CAPPluginReturnPromise)
    ]

    @objc func demander(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            // La scène de la fenêtre qui porte la webview : sur iPad et sur Mac,
            // plusieurs scènes peuvent coexister, et c'est celle-ci qu'on regarde.
            if let scene = self?.bridge?.viewController?.view.window?.windowScene {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve()
        }
    }
}
