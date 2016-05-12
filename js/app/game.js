"use strict";

var GAME_CONSTANTS = {
    PLAYER: {
        X: 1,
        O: 2
    },
    CELL_STATE: {
        EMPTY: 0,
        X_AVAILABLE: 0b0001,
        X_ZOMBIE: 0b0010,
        X_ZOMBIE_CONNECTED: 0b0011,
        X: 0b0100,
        X_TARGET: 0b0101,
        O_AVAILABLE: 0b1001,
        O_ZOMBIE: 0b1010,
        O_ZOMBIE_CONNECTED: 0b1011,
        O: 0b1100,
        O_TARGET: 0b1101
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
        return (
            <div className="game">
                <Board player={this.state.currentPlayer} onTurnHaveBeenDone={this.handleTurnHaveBeenDone}/>
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
        cells[0][0] = GAME_CONSTANTS.CELL_STATE.X_AVAILABLE;

        cells[GAME_CONSTANTS.N - 1][GAME_CONSTANTS.N - 1] = GAME_CONSTANTS.CELL_STATE.O_AVAILABLE;
        return {
            cells: cells
        };
    },
    handleCellClick: function (i, j, state) {
        var newCellState,
            cells = this.state.cells;
        switch (this.props.player) {
            case GAME_CONSTANTS.PLAYER.X:
                switch (state) {
                    case GAME_CONSTANTS.CELL_STATE.X_AVAILABLE:
                        newCellState = GAME_CONSTANTS.CELL_STATE.X;
                        break;
                    case GAME_CONSTANTS.CELL_STATE.O_TARGET:
                        newCellState = GAME_CONSTANTS.CELL_STATE.X_ZOMBIE;
                        break;
                }
                break;
            case GAME_CONSTANTS.PLAYER.O:
                switch (state) {
                    case GAME_CONSTANTS.CELL_STATE.O_AVAILABLE:
                        newCellState = GAME_CONSTANTS.CELL_STATE.O;
                        break;
                    case GAME_CONSTANTS.CELL_STATE.X_TARGET:
                        newCellState = GAME_CONSTANTS.CELL_STATE.O_ZOMBIE;
                        break;
                }
                break;
        }
        if (newCellState) {
            cells[i][j] = newCellState;
            this.setState({cells: cells});
            this.props.onTurnHaveBeenDone(i, j);
            this.refreshAvailableCells();
        }
        //console.log("cell clicked", arguments);
    },
    refreshAvailableCells: function () {
        var cells = this.state.cells, newCellState,
            i, j,
            xx = [], xxz = [], oo = [], ooz = [];

        //reset all cells
        for (i = 0; i < GAME_CONSTANTS.N; i++) {
            for (j = 0; j < GAME_CONSTANTS.N; j++) {
                newCellState = cells[i][j];
                switch (cells[i][j]) {
                    case GAME_CONSTANTS.CELL_STATE.X:
                        xx.push([i, j]);
                        break;
                    case GAME_CONSTANTS.CELL_STATE.X_TARGET:
                        newCellState = GAME_CONSTANTS.CELL_STATE.X;
                        break;
                    case GAME_CONSTANTS.CELL_STATE.X_ZOMBIE:
                        xxz.push([i, j]);
                        break;
                    case GAME_CONSTANTS.CELL_STATE.X_ZOMBIE_CONNECTED:
                        xxz.push([i, j]);
                        newCellState = GAME_CONSTANTS.CELL_STATE.X_ZOMBIE;
                        break;
                    case GAME_CONSTANTS.CELL_STATE.O:
                        oo.push([i, j]);
                        break;
                    case GAME_CONSTANTS.CELL_STATE.O_TARGET:
                        oo.push([i, j]);
                        newCellState = GAME_CONSTANTS.CELL_STATE.O;
                        break;
                    case GAME_CONSTANTS.CELL_STATE.O_ZOMBIE:
                        ooz.push([i, j]);
                        break;
                    case GAME_CONSTANTS.CELL_STATE.O_ZOMBIE_CONNECTED:
                        ooz.push([i, j]);
                        newCellState = GAME_CONSTANTS.CELL_STATE.O_ZOMBIE;
                        break;
                    case GAME_CONSTANTS.CELL_STATE.X_AVAILABLE:
                    case GAME_CONSTANTS.CELL_STATE.O_AVAILABLE:
                        newCellState = GAME_CONSTANTS.CELL_STATE.EMPTY;
                        break;
                }
                cells[i][j] = newCellState;
            }
        }

        // update neighbours
        var xxzc = [], xxzc_new = [], oozc = [], oozc_new = [],
            xStateToState = {}, oStateToState = {};
        xStateToState[GAME_CONSTANTS.CELL_STATE.EMPTY.toString()] = GAME_CONSTANTS.CELL_STATE.X_AVAILABLE;
        xStateToState[GAME_CONSTANTS.CELL_STATE.X_ZOMBIE.toString()] = GAME_CONSTANTS.CELL_STATE.X_ZOMBIE_CONNECTED;
        xStateToState[GAME_CONSTANTS.CELL_STATE.O.toString()] = GAME_CONSTANTS.CELL_STATE.O_TARGET;

        oStateToState[GAME_CONSTANTS.CELL_STATE.EMPTY.toString()] = GAME_CONSTANTS.CELL_STATE.O_AVAILABLE;
        oStateToState[GAME_CONSTANTS.CELL_STATE.O_ZOMBIE.toString()] = GAME_CONSTANTS.CELL_STATE.O_ZOMBIE_CONNECTED;
        oStateToState[GAME_CONSTANTS.CELL_STATE.X.toString()] = GAME_CONSTANTS.CELL_STATE.X_TARGET;

        var updateNeighbours = function (ix, jx, stateToState, zzc = [], zzc_new = []) {
            for (i = Math.max(ix - 1, 0); i < Math.min(ix + 2, GAME_CONSTANTS.N); i++) {
                for (j = Math.max(jx - 1, 0); j < Math.min(jx + 2, GAME_CONSTANTS.N); j++) {
                    //console.log(i, j);
                    if ((i == ix) && (j == jx)) {
                        continue;
                    }

                    if (stateToState.hasOwnProperty(cells[i][j].toString())) {
                        cells[i][j] = stateToState[cells[i][j].toString()];
                    }
                }
            }
        };

        xx.forEach(x=> updateNeighbours(x[0], x[1], xStateToState, xxzc, xxzc_new));
        oo.forEach(o=> updateNeighbours(o[0], o[1], oStateToState, oozc, oozc_new));

        cells[0][0] = cells[0][0] || GAME_CONSTANTS.CELL_STATE.X_AVAILABLE;
        cells[GAME_CONSTANTS.N - 1][GAME_CONSTANTS.N - 1] = cells[GAME_CONSTANTS.N - 1][GAME_CONSTANTS.N - 1] || GAME_CONSTANTS.CELL_STATE.O_AVAILABLE;
        this.setState({cells: cells});
    },
    render: function () {
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