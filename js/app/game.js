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
                currentSpecies: Virus.SPECIES[0],
                turnsLeft: this.props.turns,
                viruses: [],
                cells: cells
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
            return this.updateReachable(cells);
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
                        .filter(y=>(!y.virus || (y.virus.species === species)));
                    pretendRealm.forEach(x=> x.reachableBy[species] = true);
                    newReachableCells = newReachableCells.concat(pretendRealm);
                });
                infectionWave = newReachableCells;
            }
        },
        updateReachable: function (cells) {
            Virus.SPECIES.forEach(x => this.updateReachableBySpecies(x, cells));
            return this.updateCellsPermitted(cells);
        },
        updateCellsPermitted: function (cells) {
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
            return (<div className="game">
                <div className={"board species-" + this.state.currentSpecies}>
                    {this.getCellNodes()}
                </div>
                <Info currentSpecies={this.state.currentSpecies} turnsLeft={this.state.turnsLeft}/>
                <input type="button" value="Pass"/>
                <input type="button" value="Surrender"/>
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
                }
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
            return (
                <div className="info">
                    <div>Current Species: {this.props.currentSpecies}</div>
                    <div>Turns Left: {this.props.turnsLeft}</div>
                </div>
            );
        }
    });

ReactDOM.render(<Game size={11} turns={3} cellWidth={50}/>, document.getElementById('container'));