import {
    IAppAccessors,
    ILogger,
    IConfigurationExtend,
    IRead, IHttp, IPersistence, IModify,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { UIActionButtonContext } from '@rocket.chat/apps-engine/definition/ui';
import { UIKitActionButtonInteractionContext, IUIKitResponse } from '@rocket.chat/apps-engine/definition/uikit';

export class FilteredUsersApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async initialize(configuration: IConfigurationExtend): Promise<void> {
        configuration.ui.registerButton({
            actionId: 'listusersgrouped',
            labelI18n: 'list_users_by_roles',
            context: UIActionButtonContext.ROOM_ACTION,
        })
    }

    private cache = new Map<string, number>()

    public async executeActionButtonHandler(
        context: UIKitActionButtonInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<IUIKitResponse> {
        try {
            const { user, triggerId, room } = context.getInteractionData();

            const leaders = await read.getRoomReader().getLeaders(room.id)
            const owners = await read.getRoomReader().getOwners(room.id)
            const moderators = await read.getRoomReader().getModerators(room.id)

            const blocks = modify.getCreator().getBlockBuilder();

            const addsection = (users) => {
                if (!users.length) {
                    blocks.addSectionBlock({ text: blocks.newMarkdownTextObject("_No users found_") })
                    return
                }

                users.forEach(user =>
                    blocks.addSectionBlock({ text: blocks.newMarkdownTextObject(`*${user.name}* (${user.username})`), accessory: blocks.newButtonElement({ text: blocks.newPlainTextObject('Message'), url: `/direct/${user.username}` }) })
                )

                blocks.addDividerBlock();
            }

            blocks.addContextBlock({
                elements: [
                    blocks.newPlainTextObject('Owners'),
                ]
            })

            addsection(owners)

            blocks.addContextBlock({
                elements: [
                    blocks.newPlainTextObject('Leaders'),
                ]
            })

            addsection(leaders)

            blocks.addContextBlock({
                elements: [
                    blocks.newPlainTextObject('Moderators'),
                ]
            })

            addsection(moderators);

            modify.getUiController().openContextualBarView({
                id: 'user-list-by-roles',
                title: blocks.newPlainTextObject("Elevated users for this room"),
                clearOnClose: true,
                blocks: blocks.getBlocks(),
            }, { triggerId }, user);

            return { success: true }
        } catch (e) {
            this.getLogger().error(e)
            return { success: false }
        }
    }

}
