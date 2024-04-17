
# Installation

You must first have bun installed with the following command:
```sh
curl -fsSL https://bun.sh/install | sh
```

Then install the dependencies with the following command:
```sh
bun i
```

# Usage
### STEP 1: COLLECT LAUNCHES
> This will export/merge the launches to a `launches.json` file in the root directory of the project for the given day, without overwriting any existing launches
```sh
bun run get_launches.ts
```

> [!IMPORTANT]
> Ensure you set the `DAY` and `MONTH` variables in `get_launches.ts` to the day and month you want to collect launches for

---

### STEP 2. OUTREACH GENERATION
Run the following command to generate the twitter DMs and comments with `OpenAI`
```sh
bun run generation.ts
```

> [!NOTE]
> This script will not generate comments or DMs for launches that have been already generated

---

### STEP 3: OUTREACH
> Run the following command to start the outreach process

```sh
bun run helper.ts
```


> [!NOTE]
> The following script will:
> 1. load the `launches.json` file
> 2. for each `launch` without comments sent
>    1. copies launch comment to the clipboard
>    2. Open the launch page in the browser, where you will paste the comment and upvote the post
>    3. for each `maker` with a twitter profile
>       1. copies twitter pre-launch DM to the clipboard
>       2. open the twitter profile in the browser for you to DM

> [!NOTE]
> - This script will not comment on the launches that already have comments sent
> - The script will not DM the makers that already have a DM sent

> [!WARNING]
> This script will mark launches and maker DMs as sent in the `launches.json` file for each iteration. Ensure you post/dm the necessary clipboard content before continuing in the program.

> [!CAUTION]
> You must run this script until you have run the generation step