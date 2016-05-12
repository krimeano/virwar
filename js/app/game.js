"use strict";

var GAME_CONSTANTS = {
    PLAYER: {
        X: 1,
        O: 2
    },
    CELL_STATE: {
        EMPTY: 0,
        X: {
            AVAILABLE: 0b0001, //1
            ZOMBIE: 0b0010, //2
            ZOMBIE_CONNECTED: 0b0011, //3
            ALIVE: 0b0100, //4
            TARGET: 0b0101 //5
        },
        O: {
            AVAILABLE: 0b1001, //9
            ZOMBIE: 0b1010, //10
            ZOMBIE_CONNECTED: 0b1011, //11
            ALIVE: 0b1100, //12
            TARGET: 0b1101 //13
        }
    },
    N: 10,
    W: 50,
    TURNS: 3
};

var Game = React.createClass({
    getInitialState: function () {
        return {
            currentPlayer: GAME_CONSTANTS.PLAYER.X,
            turns: []
        }
    },
    handlePass: function () {
        //@todo: rollback player turns
        this.handleComplete()
    },
    handleComplete: function () {
        var newState = {
            turns: [],
            currentPlayer: 3 - this.state.currentPlayer
        };
        this.setState(newState);
    },
    handleTurnHaveBeenDone: function (i, j) {
        var newState = {
            turns: this.state.turns
        };
        newState.turns.push([i, j]);

        this.setState(newState);
        if (this.state.turns.length == GAME_CONSTANTS.TURNS) {
            this.handleComplete();
        }
    },
    render: function () {
        var pp = ['', 'X', 'O'],
            cell_states = {
                player: GAME_CONSTANTS.CELL_STATE[pp[this.state.currentPlayer]],
                enemy: GAME_CONSTANTS.CELL_STATE[pp[3 - this.state.currentPlayer]]
            };

        return (
            <div className="game">
                <Board player={this.state.currentPlayer} onTurnHaveBeenDone={this.handleTurnHaveBeenDone}
                       cell_states={cell_states}
                />
                <Info player={this.state.currentPlayer} turns={this.state.turns.length}/>
                <input type="button" onClick={this.handlePass} value="Pass" disabled={this.state.turns.length > 0}/>
            </div>
        )
    }
});


var Board = React.createClass({
    getInitialState: function () {
        var cells = [], row;
        for (let i = 0; i < GAME_CONSTANTS.N; i++) {
            row = [];
            for (let j = 0; j < GAME_CONSTANTS.N; j++) {
                row.push(GAME_CONSTANTS.CELL_STATE.EMPTY)
            }
            cells.push(row);
        }
        cells[0][0] = GAME_CONSTANTS.CELL_STATE.X.AVAILABLE;

        cells[GAME_CONSTANTS.N - 1][GAME_CONSTANTS.N - 1] = GAME_CONSTANTS.CELL_STATE.O.AVAILABLE;
        return {
            cells: cells
        };
    },
    handleCellClick: function (i, j, state) {
        var newCellState,
            cells = this.state.cells;
        switch (state) {
            case this.props.cell_states.player.AVAILABLE:
                newCellState = this.props.cell_states.player.ALIVE;
                break;
            case this.props.cell_states.enemy.TARGET:
                newCellState = this.props.cell_states.player.ZOMBIE;
                break;
        }
        if (newCellState) {
            //console.log(cells[i][j], '=>', newCellState);
            cells[i][j] = newCellState;
            this.setState({cells: cells});
            this.props.onTurnHaveBeenDone(i, j);
        }
        //console.log("cell clicked", arguments);
    },
    refreshAvailableCells: function () {
        //console.log('refresh cells', this.props.player);
        var player_cell = this.props.cell_states.player,
            enemy_cell = this.props.cell_states.enemy,
            cells = this.state.cells,
            vv = [],
            zz = [],
            newCellState, i, j;

        //reset all cells
        for (i = 0; i < GAME_CONSTANTS.N; i++) {
            for (j = 0; j < GAME_CONSTANTS.N; j++) {
                newCellState = cells[i][j];
                switch (cells[i][j]) {
                    case player_cell.ALIVE:
                        vv.push([i, j]);
                        break;
                    case player_cell.TARGET:
                        vv.push([i, j]);
                        newCellState = player_cell.ALIVE;
                        break;
                    case player_cell.ZOMBIE:
                        zz.push([i, j]);
                        break;
                    case player_cell.ZOMBIE_CONNECTED:
                        zz.push([i, j]);
                        newCellState = player_cell.ZOMBIE;
                        break;
                    case enemy_cell.TARGET:
                        newCellState = enemy_cell.ALIVE;
                        break;
                    case enemy_cell.ZOMBIE_CONNECTED:
                        newCellState = enemy_cell.ZOMBIE;
                        break;
                    case player_cell.AVAILABLE:
                    case enemy_cell.AVAILABLE:
                        newCellState = GAME_CONSTANTS.CELL_STATE.EMPTY;
                        break;
                }
                cells[i][j] = newCellState;
            }
        }
        //console.log('refresh cells', this.props.player, vv);
        // update neighbours
        var zz_c = [], zz_c_new = [],
            stateToState = {};
        stateToState[GAME_CONSTANTS.CELL_STATE.EMPTY.toString()] = player_cell.AVAILABLE;
        stateToState[player_cell.ZOMBIE.toString()] = player_cell.ZOMBIE_CONNECTED;
        stateToState[enemy_cell.ALIVE.toString()] = enemy_cell.TARGET;
        //console.log(stateToState);
        var updateNeighbours = function (ix, jx, stateToState, zzc = [], zzc_new = []) {
            for (i = Math.max(ix - 1, 0); i < Math.min(ix + 2, GAME_CONSTANTS.N); i++) {
                for (j = Math.max(jx - 1, 0); j < Math.min(jx + 2, GAME_CONSTANTS.N); j++) {
                    //console.log(i, j);
                    if ((i == ix) && (j == jx)) {
                        console.log(i, ix, j, jx);
                        continue;
                    }
                    if (stateToState.hasOwnProperty(cells[i][j].toString())) {
                        cells[i][j] = stateToState[cells[i][j].toString()];
                    }
                }
            }
        };

        vv.forEach(v=> updateNeighbours(v[0], v[1], stateToState, zz_c, zz_c_new));

        cells[0][0] = cells[0][0] || GAME_CONSTANTS.CELL_STATE.X.AVAILABLE;
        cells[GAME_CONSTANTS.N - 1][GAME_CONSTANTS.N - 1] = cells[GAME_CONSTANTS.N - 1][GAME_CONSTANTS.N - 1] || GAME_CONSTANTS.CELL_STATE.O.AVAILABLE;
        //this.setState({cells: cells});
    },
    render: function () {
        this.refreshAvailableCells();
        var self = this,
            cellNodes = [];

        self.state.cells.forEach((r, ix)=>r.forEach((s, jx) => {
            cellNodes.push(<Cell ix={ix} jx={jx} state={s} key={ix + '-' + jx} onCellClick={self.handleCellClick}/>);
        }));
        return (
            <div className={"board player-" + this.props.player}>
                {cellNodes}
            </div>
        )
    }

});

var Cell = React.createClass({
    handleClick: function () {
        this.props.onCellClick(this.props.ix, this.props.jx, this.props.state);
    },
    render: function () {
        return (
            <div className={"cell state-" + this.props.state}
                 style={{top:(GAME_CONSTANTS.W * this.props.ix) +"px",left: (GAME_CONSTANTS.W * this.props.jx) + "px"}}
                 onClick={this.handleClick}
            ></div>
        )
    }
});

var Info = React.createClass({
    render: function () {

        return (
            <div className="info">
                <div>Current Player: {['-', 'X', 'O'][this.props.player]}</div>
                <div>Turns Left: {GAME_CONSTANTS.TURNS - this.props.turns}</div>

            </div>
        )
    }
});

ReactDOM.render(<Game />, document.getElementById('container'));