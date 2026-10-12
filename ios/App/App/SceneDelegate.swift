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

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
