#if targetEnvironment(macCatalyst)
import Capacitor
import UIKit
import WebKit

/// Sur Mac, la vibration et la barre d'état n'ont pas d'objet : pas de moteur
/// haptique sous le doigt, pas de barre d'état dans une fenêtre. Plutôt que de
/// laisser leurs greffons parler à des API qui ne font rien, ou pas pareil
/// selon la version de macOS, `EcranWeb` les remplace par ces deux-là, sous le
/// même nom JavaScript : chaque appel répond tout de suite, sans effet.
///
/// Toutes les méthodes des greffons d'origine sont reprises, même celles que
/// le web n'appelle pas : une méthode absente laisserait la promesse en
/// suspens au lieu de la rejeter.
@objc(VibrationMuettePlugin)
public class VibrationMuettePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VibrationMuettePlugin"
    public let jsName = "Haptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "impact", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "notification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectionStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectionChanged", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectionEnd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vibrate", returnType: CAPPluginReturnPromise)
    ]

    @objc func impact(_ call: CAPPluginCall) { call.resolve() }
    @objc func notification(_ call: CAPPluginCall) { call.resolve() }
    @objc func selectionStart(_ call: CAPPluginCall) { call.resolve() }
    @objc func selectionChanged(_ call: CAPPluginCall) { call.resolve() }
    @objc func selectionEnd(_ call: CAPPluginCall) { call.resolve() }
    @objc func vibrate(_ call: CAPPluginCall) { call.resolve() }
}

@objc(BarreEtatMuettePlugin)
public class BarreEtatMuettePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BarreEtatMuettePlugin"
    public let jsName = "StatusBar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setStyle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBackgroundColor", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setOverlaysWebView", returnType: CAPPluginReturnPromise)
    ]

    @objc func setStyle(_ call: CAPPluginCall) { call.resolve() }
    @objc func setBackgroundColor(_ call: CAPPluginCall) { call.resolve() }
    @objc func show(_ call: CAPPluginCall) { call.resolve() }
    @objc func hide(_ call: CAPPluginCall) { call.resolve() }
    /// Une fenêtre Mac n'a pas de barre d'état : visible, non, et rien dessus.
    @objc func getInfo(_ call: CAPPluginCall) {
        call.resolve(["visible": false, "style": "DEFAULT", "overlays": false])
    }
    @objc func setOverlaysWebView(_ call: CAPPluginCall) { call.resolve() }
}

/// Le greffon `Browser` ouvre un Safari intégré (`SFSafariViewController`)
/// par-dessus l'écran. Sur Mac il n'ouvrait rien du tout (vu à l'écran le 30
/// octobre : un lien de licence restait sans effet). Une app Mac envoie les
/// liens d'un autre site au navigateur par défaut : c'est ce que fait celui-ci,
/// sous le même nom JavaScript, sans toucher à `natif.ts`.
@objc(NavigateurMacPlugin)
public class NavigateurMacPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NavigateurMacPlugin"
    public let jsName = "Browser"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "close", returnType: CAPPluginReturnPromise)
    ]

    @objc func open(_ call: CAPPluginCall) {
        guard let texte = call.getString("url"), let adresse = URL(string: texte),
              adresse.scheme == "https" || adresse.scheme == "http" else {
            call.reject("Adresse invalide")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(adresse) { ouvert in
                ouvert ? call.resolve() : call.reject("Rien n'a pu ouvrir l'adresse")
            }
        }
    }

    /// Rien à refermer : la page vit dans le navigateur, pas dans l'app.
    @objc func close(_ call: CAPPluginCall) { call.resolve() }
}

/// Le greffon `Share` pose la feuille de partage au centre de la vue
/// (`setCenteredPopover`). Sur Mac c'est une bulle à flèche : elle pointait le
/// milieu de la page, à côté du bouton (vu à l'écran le 30 octobre). Celui-ci
/// reprend le même contrat, sous le même nom JavaScript, et accroche la bulle
/// à `ancre`, la place du bouton que la page envoie en pixels CSS (`partager`
/// de `natif.ts`). Sans ancre, le centre, comme l'original.
@objc(PartageMacPlugin)
public class PartageMacPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PartageMacPlugin"
    public let jsName = "Share"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canShare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    @objc func canShare(_ call: CAPPluginCall) { call.resolve(["value": true]) }

    @objc func share(_ call: CAPPluginCall) {
        var elements = [Any]()
        if let texte = call.getString("text") { elements.append(texte) }
        if let texte = call.getString("url"), let adresse = URL(string: texte) { elements.append(adresse) }
        guard !elements.isEmpty else {
            call.reject("Must provide at least url, text or files")
            return
        }
        let titre = call.getString("title")
        let ancre = call.getObject("ancre")

        DispatchQueue.main.async { [weak self] in
            guard let self, let ecran = self.bridge?.viewController, let page = self.webView else {
                call.reject("Pas de vue où présenter la feuille")
                return
            }
            if ecran.presentedViewController != nil {
                call.reject("Can't share while sharing is in progress")
                return
            }
            let feuille = UIActivityViewController(activityItems: elements, applicationActivities: nil)
            if let titre { feuille.setValue(titre, forKey: "subject") }
            feuille.completionWithItemsHandler = { genre, fait, _, erreur in
                if let erreur {
                    call.reject("Error sharing item", nil, erreur)
                } else if fait {
                    call.resolve(["activityType": genre?.rawValue ?? ""])
                } else {
                    call.reject("Share canceled")
                }
            }
            if let bulle = feuille.popoverPresentationController {
                bulle.sourceView = page
                bulle.sourceRect = Self.place(de: ancre, dans: page)
            }
            ecran.present(feuille, animated: true)
        }
    }

    /// Pixels CSS de la fenêtre vers points de la webview : le zoom du texte
    /// (`pageZoom`, ⌘+ ⌘−) les multiplie, la marge de défilement les décale.
    static func place(de ancre: JSObject?, dans page: WKWebView) -> CGRect {
        guard let ancre,
              let x = ancre["x"] as? Double, let y = ancre["y"] as? Double,
              let largeur = ancre["largeur"] as? Double, let hauteur = ancre["hauteur"] as? Double else {
            return CGRect(x: page.bounds.midX, y: page.bounds.midY, width: 0, height: 0)
        }
        let zoom = page.pageZoom
        let marge = page.scrollView.adjustedContentInset
        return CGRect(x: x * zoom + marge.left, y: y * zoom + marge.top,
                      width: largeur * zoom, height: hauteur * zoom)
    }
}
#endif
