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
        this.isReachable = false;
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
            console.log(newState);
            this.setState(newState);
        },
        refreshCells: function () {
            console.log('refreshCells');
            var ix = this.state.cells.length,
                cell;
            while (ix--) {
                cell = this.state.cells[ix];
                cell.isPermitted = false;
                cell.isReachable = false;
            }

            return this.updateCellsPermitted();
        },
        updateCellsPermitted: function () {
            var corners = [0, this.props.size - 1],
                infectedCells = this.state.cells.filter(x => (x.virus && x.virus.species === this.state.currentSpecies));
            //console.log(infectedCells);
            if (!infectedCells.length) {
                this.state.cells
                    .filter(x => (corners.indexOf(x.i) >= 0 && corners.indexOf(x.j) >= 0 && !x.virus))
                    .forEach(x => x.isPermitted = true);
            }
            infectedCells.forEach(x=> {
                this.state.cells
                    .filter(y=>((y.i >= x.i - 1) && (y.i <= x.i + 1) && (y.j >= x.j - 1) && (y.j <= x.j + 1) && !(y.virus && (y.virus.isDead || y.virus.species === this.state.currentSpecies))))
                    .forEach(y=>y.isPermitted = true);
            });
            return this.state.cells;
        },
        getCellNodes: function () {
            var self = this;
            return this.refreshCells().map(x => (
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
            var classes = ["cell"];
            if (this.props.cell.isPermitted) {
                classes.push("permitted");
            }
            if (this.props.cell.virus) {
                classes.push("virus-" + this.props.cell.virus.species);
                if (this.props.cell.virus.isDead) {
                    classes.push("dead");
                    if (this.props.cell.virus.isZombie) {
                        classes.push("zombie");
                    }
                } else {
                    classes.push("alive");
                }
            }
            return (<div className={classes.join(" ")}
                         style={{
                         top: (this.props.width * this.props.cell.i) +"px",
                         left: (this.props.width * this.props.cell.j) + "px"
                         }}
                         onClick={this.props.cell.isPermitted && this.handleClick}
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