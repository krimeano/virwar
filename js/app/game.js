"use strict";


class Virus {
    static get SPECIES() {
        return ['X', 'O'];
    }

    static nextSpecies(s) {
        var ss = Virus.SPECIES;
        return ss[(ss.indexOf(s) + 1) % ss.length]
    }

    constructor(species) {
        if (this.constructor.SPECIES.indexOf(species) < 0) {
            throw "Species should be in set " + JSON.stringify(this.constructor.SPECIES);
        }
        this.species = species;
        this.isDead = false;
        this.isZombie = false;
        this.isSurvived = false;
    }

    kill(bySpecies) {
        if (this.isDead) {
            throw "Virus is already dead";
        }
        if (this.species === bySpecies) {
            throw "Viruses can't kill the same species";
        }
        if (this.constructor.SPECIES.indexOf(bySpecies) < 0) {
            throw "Species should be in set " + JSON.stringify(this.constructor.SPECIES);
        }
        this.species = bySpecies;
        this.isDead = true;
    }

    wakeUp() {
        if (!this.isDead) {
            throw "Only dead viruses can be zombies";
        }
        this.isZombie = true;
    }

    lull() {
        if (!this.isDead) {
            throw "Only dead viruses can be zombies";
        }
        this.isZombie = false;
    }
}

class Cell {
    constructor(i, j, virus) {
        this.i = i;
        this.j = j;
        this.virus = virus || null;
        this.isPermitted = false;
        this.reachableBy = {};
    }
}


var Game = React.createClass({
        getInitialState: function () {
            var cells = [];
            for (let i = 0; i < this.props.size; i++) {
                for (let j = 0; j < this.props.size; j++) {
                    cells.push(new Cell(i, j));
                }
            }
            return {
                isStalemate: false,
                currentSpecies: Virus.SPECIES[0],
                turnsLeft: this.props.turns,
                viruses: [],
                cells: cells,
                passes: 0,
                winner: null
            }
        },

        handleCellClick: function (cell) {
            if (!cell.isPermitted) {
                throw "Cell click is not permitted";
            }

            if (cell.virus) {
                cell.virus.kill(this.state.currentSpecies);
            } else {
                cell.virus = new Virus(this.state.currentSpecies);
            }
            var turnsLeft = this.state.turnsLeft - 1,
                newSpecies = turnsLeft ? this.state.currentSpecies : Virus.nextSpecies(this.state.currentSpecies),
                newState = {
                    currentSpecies: newSpecies,
                    turnsLeft: turnsLeft || this.props.turns
                };
            //console.log(newState);
            this.setState(newState);
        },


        handlePass: function () {
            var passes = this.state.passes + 1;
            //console.log(passes);
            this.setState({
                currentSpecies: Virus.nextSpecies(this.state.currentSpecies),
                turnsLeft: this.props.turns,
                passes: passes,
                isStalemate: passes >= Virus.SPECIES.length
            });
        },

        handleSurrender: function () {
            this.setState({
                winner: Virus.nextSpecies(this.state.currentSpecies)
            });
        },
        handleReset: function () {
            this.setState(this.getInitialState());
        },

        filterSurroundCells: function (x, y) {
            return (y.i >= x.i - 1) && (y.i <= x.i + 1) && (y.j >= x.j - 1) && (y.j <= x.j + 1) && !((x.i === y.i) && (x.j === y.j));
        },

        refreshCells: function (cells) {
            cells.forEach(x=> {
                x.isPermitted = false;
                x.reachableBy = {};
                x.virus && x.virus.isDead && x.virus.lull();
            });

            return this.updateZombies(cells);
        },

        updateZombies: function (cells) {
            var infectionWave = cells.filter(x => (x.virus && !x.virus.isDead));

            while (infectionWave.length) {
                var newZombies = [];
                infectionWave.forEach(x=> {
                    var deadToMakeZombies = cells.filter(y=>this.filterSurroundCells(x, y))
                        .filter(y=>(y.virus && y.virus.species === x.virus.species && y.virus.isDead && !y.virus.isZombie));
                    deadToMakeZombies.forEach(y=> y.virus.wakeUp());
                    newZombies = newZombies.concat(deadToMakeZombies)
                });
                infectionWave = newZombies;
            }
            return this.updateSurvived(cells);
        },

        updateReachableBySpecies: function (species, cells) {
            var deadViruses = cells.filter(x => (x.virus && x.virus.isDead && x.virus.species !== species)),
                infectionWave = cells.filter(x => (x.virus && !x.virus.isDead && x.virus.species === species));
            if (!(infectionWave.length + deadViruses.length)) {
                var corners = [0, this.props.size - 1];
                infectionWave = cells.filter(x => (corners.indexOf(x.i) >= 0 && corners.indexOf(x.j) >= 0 && !x.virus))
            }
            infectionWave.forEach(x=> x.reachableBy[species] = true);
            while (infectionWave.length) {
                var newReachableCells = [];
                infectionWave.forEach(x=> {
                    var pretendRealm = cells.filter(y=>this.filterSurroundCells(x, y) && !y.reachableBy[species])
                        .filter(y=>(!y.virus || !y.virus.isDead || y.virus.species === species));
                    pretendRealm.forEach(x=> x.reachableBy[species] = true);
                    newReachableCells = newReachableCells.concat(pretendRealm);
                });
                infectionWave = newReachableCells;
            }
        },

        updateSurvived: function (cells) {
            Virus.SPECIES.forEach(x => this.updateReachableBySpecies(x, cells));

            var survivedSpecies = {};
            cells.filter(x => (x.virus && !x.virus.isDead))
                .forEach(x=> {
                    var isSurvived = true;
                    Object.keys(x.reachableBy).forEach(r=> {
                        if (r === x.virus.species) {
                            return;
                        }
                        if (x.reachableBy[r]) {
                            isSurvived = false;
                            return false;
                        }
                    });
                    x.virus.isSurvived = isSurvived;
                    if (isSurvived) {
                        survivedSpecies[x.virus.species] = true;
                    }
                });
            if (Object.keys(survivedSpecies).length > 1) {
                this.state.isStalemate = true;
            }
            return this.updateCellsPermitted(cells);
        },

        updateCellsPermitted: function (cells) {
            if (this.state.isStalemate || this.state.winner) {
                return cells;
            }
            var corners = [0, this.props.size - 1],
                cellDeadAny = cells.filter(x => x.virus && x.virus.isDead),
                infectedCells = cells.filter(x => (x.virus && x.virus.species === this.state.currentSpecies && (!x.virus.isDead || x.virus.isZombie)));

            //console.log(infectedCells);
            if (!infectedCells.length && !cellDeadAny.length) {
                cells.filter(x => (corners.indexOf(x.i) >= 0 && corners.indexOf(x.j) >= 0 && !x.virus))
                    .forEach(x => x.isPermitted = true);
            }
            else {
                infectedCells.forEach(x=> {
                    cells.filter(y=>this.filterSurroundCells(x, y))
                        .filter(y=>!(y.virus && (y.virus.isDead || y.virus.species === this.state.currentSpecies)))
                        .forEach(y=>y.isPermitted = true);
                });
            }
            return cells;
        },

        getCellNodes: function () {
            var self = this;
            return this.refreshCells(this.state.cells).map(x => (
                <BoardCell cell={x} width={self.props.cellWidth} key={x.i + '-' + x.j} onCellClick={this.handleCellClick}/>
            ))
        },

        render: function () {
            var cellNodes = this.getCellNodes(),
                survivedCells = this.state.cells.filter(x=>x.virus && x.virus.isSurvived),
                survivedSpecies = {},
                passTxt = this.state.passes < Virus.SPECIES.length - 1 ? 'Pass' : 'Accept stalemate',
                passButton = (this.state.isStalemate || this.state.winner || (this.state.turnsLeft < this.props.turns)) ? '' :
                    (<input type="button" value={passTxt} onClick={this.handlePass}/>),
                surrenderButton = (this.state.isStalemate || this.state.winner) ? '' :
                    (<input type="button" value="Surrender" onClick={this.handleSurrender}/>),
                resetButton = (this.state.isStalemate || this.state.winner) ?
                    (<input type="button" value="New game" onClick={this.handleReset}/>) : '';
            survivedCells.forEach(x=>survivedSpecies[x.virus.species] = true);
            return (<div className="game">
                <div className={"board species-" + this.state.currentSpecies}>
                    {cellNodes}
                </div>
                <Info currentSpecies={this.state.currentSpecies} turnsLeft={this.state.turnsLeft}
                      survivedSpecies={Object.keys(survivedSpecies)} isStalemate={this.state.isStalemate}
                      winner={this.state.winner}/>
                {passButton}
                {surrenderButton}
                {resetButton}
            </div>);
        }
    }),

    BoardCell = React.createClass({
        handleClick: function () {
            this.props.onCellClick(this.props.cell)
        },
        render: function () {
            var classes = ["cell"],
                cell = this.props.cell;
            if (cell.isPermitted) {
                classes.push("permitted");
            }
            if (cell.virus) {
                classes.push("virus-" + cell.virus.species);
                if (cell.virus.isDead) {
                    classes.push("dead");
                    if (cell.virus.isZombie) {
                        //console.log('zombie', cell);
                        classes.push("zombie");
                    }
                } else {
                    classes.push("alive");
                    if (cell.virus.isSurvived) {
                        classes.push("survived");
                    }
                }
            } else {
                classes.push("empty");
            }
            Object.keys(cell.reachableBy).forEach(x => {
                if (cell.reachableBy[x]) {
                    classes.push("reachable-" + x)
                }

            });
            return (<div className={classes.join(" ")}
                         style={{
                         top: (this.props.width * cell.i) +"px",
                         left: (this.props.width * cell.j) + "px"
                         }}
                         onClick={cell.isPermitted && this.handleClick}
            ></div>);
        }
    }),

    Info = React.createClass({
        render: function () {
            if (this.props.isStalemate) {
                return (<div className="info">
                    Stalemate
                </div>);
            }
            if (this.props.winner) {
                return (<div className="info">WINNER: {this.props.winner}</div>);
            }
            var survivedNode = this.props.survivedSpecies.length ?
                (<div>Survived: {this.props.survivedSpecies.join(', ')}</div>) :
                '';
            return (
                <div className="info">
                    <div>Current Species: {this.props.currentSpecies}</div>
                    <div>Turns Left: {this.props.turnsLeft}</div>
                    {survivedNode}
                </div>
            );
        }
    });

ReactDOM.render(<Game size={11} turns={3} cellWidth={50}/>, document.getElementById('container'));