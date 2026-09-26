import AVFoundation
import Capacitor

/// Le greffon `Son` : deux méthodes, `jouer({ nom })` et `activer({ actif })`.
///
/// Les bruitages de l'app, fabriqués par `scripts/sons_app.py` et rangés dans
/// le dossier `Sons` du bundle. Le web les appelle par `jouer()` dans
/// `src/lib/son.ts`, qui tient le réglage.
///
/// La session audio est en `.ambient`, et c'est tout l'enjeu : un son
/// d'interface se tait quand le bouton silencieux est mis, et se mêle à la
/// musique ou au podcast au lieu de les couper. Rien ne joue en arrière-plan,
/// rien ne se déclenche sans un geste de l'utilisateur.
///
/// Les lecteurs sont partagés entre les cinq onglets, préparés une fois : pas
/// de latence au premier appui, et pas cinq copies en mémoire.
@objc(SonPlugin)
public class SonPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "Son"
    public let jsName = "Son"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "jouer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "activer", returnType: CAPPluginReturnPromise)
    ]

    /// Les noms que le web peut demander, un fichier chacun.
    private static let noms = ["choix", "juste", "faux", "lecon", "fin-serie", "reussi", "echoue"]

    /// Touchés sur le fil principal seulement.
    private static var lecteurs: [String: AVAudioPlayer] = [:]
    private static var actif = true

    override public func load() {
        DispatchQueue.main.async { Self.preparer() }
    }

    @objc func jouer(_ call: CAPPluginCall) {
        let nom = call.getString("nom") ?? ""
        DispatchQueue.main.async {
            if Self.actif, let lecteur = Self.lecteurs[nom] {
                // WebKit partage la session de l'app et peut en changer la
                // catégorie : on la remet avant de jouer, si elle a bougé.
                Self.poserSession()
                lecteur.currentTime = 0
                lecteur.play()
            }
            call.resolve()
        }
    }

    @objc func activer(_ call: CAPPluginCall) {
        let actif = call.getBool("actif") ?? true
        DispatchQueue.main.async {
            Self.actif = actif
            // Couper les sons tait aussi celui qui résonne encore.
            if !actif { Self.lecteurs.values.forEach { $0.stop() } }
            call.resolve()
        }
    }

    private static func preparer() {
        guard lecteurs.isEmpty else { return }
        poserSession()
        for nom in noms {
            guard let url = Bundle.main.url(forResource: nom, withExtension: "wav", subdirectory: "Sons"),
                  let lecteur = try? AVAudioPlayer(contentsOf: url) else { continue }
            lecteur.prepareToPlay()
            lecteurs[nom] = lecteur
        }
    }

    private static func poserSession() {
        let session = AVAudioSession.sharedInstance()
        guard session.category != .ambient else { return }
        // Un échec laisse la catégorie d'avant ; le son ne vaut pas une erreur.
        try? session.setCategory(.ambient, mode: .default, options: [])
    }
}
