import clipboard from "clipboardy";
import open from "open";
import { terminal } from "terminal-kit";
import chalk from "chalk";
import type { AugmentedLaunch } from "./get_launches";

const launches = await Bun.file("launches.json", { type: "application/json" }).json() as Record<string, AugmentedLaunch>
const launches_without_sent_comment = Object.values(launches).filter(launch => !launch.sent_comment)

terminal.clear()

terminal(chalk.gray("This script will copy the comment/twitter DM to your clipboard and open the necessary URL in your browser.\n\nPress", chalk.green("ANY KEY"), chalk.gray("to continue")))

terminal.grabInput({ mouse: "button" })
const wait_for_enter = async () => await new Promise(resolve => terminal.once("key", name => name === "CTRL_C" ? terminate() : resolve(null)))

await wait_for_enter()
let l_i = 0
for (const launch of launches_without_sent_comment) {
    l_i++
    terminal.clear()
    terminal(chalk.magenta(`${l_i}/${launches_without_sent_comment.length}`), chalk.gray(" launches left to process\n"))
    clipboard.writeSync(launch.generated_comment!)
    await open(launch.launch_url)
    terminal(chalk.grey("Press "), chalk.green("ANY KEY"), chalk.grey(" to mark comment as posted\n"))

    await wait_for_enter()

    launch.sent_comment = true

    const makers = (launch.product?.makers || [])
        .filter(maker => !maker.sent_twitter_dm)
        .filter(maker => maker.founder_twitter)

    let m_i = 0
    for (const maker of makers) {
        m_i++
        if(maker.sent_twitter_dm || !maker.founder_twitter) continue
        terminal.moveTo(1, 2, chalk.magenta(`    ${m_i}/${(launch.product?.makers || []).length }`), chalk.gray(" makers left to process\n"))
        clipboard.writeSync(maker.twitter_dm_pre_launch!)
        await open(maker.founder_twitter!)
        terminal(chalk.grey("    Press "), chalk.green("ANY KEY"), chalk.grey(" to mark twitter DM as sent\n"))
        await wait_for_enter()
        maker.sent_twitter_dm = true
    }

    await Bun.write("launches.json", JSON.stringify(launches, null, 4))
}

terminal.clear()
terminal(chalk.gray("All launches have been processed. Press "), chalk.green("ANY KEY"), chalk.gray(" to exit\n"))
await wait_for_enter()
await terminate()

async function terminate() {
    terminal.grabInput(false)
    terminal.clear()
    process.removeAllListeners()
    process.exit(0)
}