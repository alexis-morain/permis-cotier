#if targetEnvironment(macCatalyst)
import Capacitor
import UIKit

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
#endif
