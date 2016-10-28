# Viruses war

## Installation instructions

1. Clone or download files from the repository to some folder on your webserver
1. Run LESS compiler to translate styles form _less/main.less_ to _css/main.css_
1. Open in browser
1. Enjoy!

## Rules

* The game is for two players
* On his move player can make three turns or pass
* Each turn is adding a new alive virus to available cell
* If the cell is already occupied by enemy's alive virus, player's virus eats it and becomes zombie
* Viruses can't eat zombies
* Available cells are cells connected to any alive virus directly or per chain of zombies
* If no viruses on the table, the only available cell is corresponding corner, and the second player starts form the opposite corner

![ScreenShot](https://raw.github.com/krimeano/virwar/master/screenshot.png)
