
import { 
    DataSourceType, 
    IDataSourcesProps, 
    IconName, 
    IconStyle, 
    IThemeOptions 
} from "../sdk/types";
import { IContainer } from "../../../common/schemas/ContainerSchemas";

export class ChatController {
    public static readonly instance = new ChatController();
    private constructor() { }

    public get dataSources(): IDataSourcesProps[] {
        const sources: IDataSourcesProps[] = [];

        for (const container of this._selectedContainers) {
            if (!container || !container.drive) {
                continue;
            }
            sources.push({
                type: DataSourceType.DocumentLibrary,
                value: {
                    name: container.displayName,
                    url: container.drive!.webUrl
                }
            });
        }

        return sources;
    }
    private _dataSourceSubscribers: ((dataSources: IDataSourcesProps[]) => void)[] = [];
    public addDataSourceSubscriber(subscriber: (dataSources: IDataSourcesProps[]) => void) {
        this._dataSourceSubscribers.push(subscriber);
    }
    public removeDataSourceSubscriber(subscriber: (dataSources: IDataSourcesProps[]) => void) {
        this._dataSourceSubscribers = this._dataSourceSubscribers.filter(s => s !== subscriber);
    }

    private _selectedContainers: IContainer[] = [];
    public get selectedContainers(): IContainer[] {
        return this._selectedContainers;
    }
    public set selectedContainers(value: IContainer[]) { console.log(value);
        this._selectedContainers = value;
        this._dataSourceSubscribers.forEach(subscriber => subscriber(this.dataSources));
    }


    public readonly header = "Tax Agent";
    public readonly theme: IThemeOptions = {
        useDarkMode: false,
        customTheme: {
            themePrimary: '#4854EE',
            themeSecondary: '#4854EE',
            themeDark: '#4854EE',
            themeDarker: '#4854EE',
            themeTertiary: '#4854EE',
            themeLight: '#dddeef',
            themeDarkAlt: '#4854EE',
            themeLighter: '#dddeef',
            themeLighterAlt: '#dddeef',
            themeDarkAltTransparent: '#4854EE',
            themeLighterTransparent: '#dddeef',
            themeLighterAltTransparent: '#dddeef',
            themeMedium: '#4854EE',
            neutralSecondary: '#4854EE',
            neutralSecondaryAlt: '#4854EE',
            neutralTertiary: '#4854EE',
            neutralTertiaryAlt: '#4854EE',
            neutralQuaternary: '#4854EE',
            neutralQuaternaryAlt: '#4854EE',
            neutralPrimaryAlt: '#4854EE',
            neutralDark: '#4854EE',
            themeBackground: 'white',
        }
    };

    public readonly zeroQueryPrompts = {
        headerText: "Tax Agent: How can I help you today?",
        promptSuggestionList: [
            {
                suggestionText: 'Summarize recent tax changes',
                iconRegular: { name: IconName.ChatBubblesQuestion, style: IconStyle.Regular },
                iconHover: { name: IconName.ChatBubblesQuestion, style: IconStyle.Filled },
            },
            {
                suggestionText: 'What are tax regulations for employers?',
                iconRegular: { name: IconName.DocumentCatchUp, style: IconStyle.Regular },
                iconHover: { name: IconName.DocumentCatchUp, style: IconStyle.Filled },
            }
        ]
    };

    public readonly suggestedPrompts = [
        "List and summarize recent tax laws",
    ];

    public readonly metaPromptStyle = "Assume that you are are a tax professional";

}