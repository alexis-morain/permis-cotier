import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // La racine est la barre d'onglets, pas une webview seule. Aucun
        // storyboard principal : `Info.plist` n'en déclare plus, sans quoi UIKit
        // instanciait une sixième `EcranWeb` depuis `Main.storyboard` avant
        // d'arriver ici, pour la jeter. C'est le seul endroit où l'écran de
        // départ se pose. L'écran de lancement, lui, reste `LaunchScreen`.
        window?.rootViewController = BarreOnglets()
        window?.makeKeyAndVisible()
        #if targetEnvironment(macCatalyst)
        reglerLaFenetre(windowScene, premierLancement: session.stateRestorationActivity == nil)
        #endif

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    #if targetEnvironment(macCatalyst)
    /// La fenêtre Mac. Dessous 800 × 600 points, la barre latérale et une page
    /// d'examen ne tiennent plus ensemble : c'est le plancher. La taille de
    /// départ ne se pose qu'au premier lancement ; ensuite la fenêtre garde ce
    /// que la personne en a fait, macOS la restaure seul.
    private func reglerLaFenetre(_ scene: UIWindowScene, premierLancement: Bool) {
        scene.sizeRestrictions?.minimumSize = CGSize(width: 800, height: 600)
        // Une barre de titre ordinaire, avec le titre visible : il suit
        // l'onglet courant (`EcranWeb.viewDidAppear`). Pas de `NSToolbar` tant
        // que le lot des menus n'a rien à y mettre.
        scene.titlebar?.titleVisibility = .visible
        scene.title = "Le Permis Côtier"
        if premierLancement {
            let origine = scene.effectiveGeometry.systemFrame.origin
            let cadre = CGRect(origin: origine, size: CGSize(width: 1100, height: 780))
            scene.requestGeometryUpdate(.Mac(systemFrame: cadre))
        }
    }
    #endif
}
