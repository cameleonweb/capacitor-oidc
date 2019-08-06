import { WebPlugin } from '@capacitor/core';
import { OAuth2AuthenticateOptions, OAuth2ClientPlugin } from "./definitions";
export declare class OAuth2ClientPluginWeb extends WebPlugin implements OAuth2ClientPlugin {
    private webOptions;
    private windowHandle;
    private intervalId;
    private loopCount;
    private intervalLength;
    constructor();
    authenticate(options: OAuth2AuthenticateOptions): Promise<any>;
    private requestResource;
    logout(options: OAuth2AuthenticateOptions): Promise<void>;
    private closeWindow;
}
declare const OAuth2Client: OAuth2ClientPluginWeb;
export { OAuth2Client };
