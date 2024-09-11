# Homework in Calendar
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/tijme)
## What is this?
This simple script will add your homework to your calendar.

## Why?
I hate the Somtoday app and I don't want to use it. I prefer looking at my
calendar.

## How to use?
Make sure you have nvm installed with node version 20.

1. Clone this repository
```bash
git clone https://github.com/7ijme/homework.git
cd cijfer-ntfyer
```
2. Install dependencies
```bash
npm install
```
3. Find your school's name in schools.json
4. Copy .env.example to .env and fill in the required fields
5. Run `ts-node get-id.ts` to get your personal id. Add this to your .env file.
6. Create a cronjob to run the script every 10 minutes
```bash
*/10 * * * * /path/to/homework/run.sh
```
