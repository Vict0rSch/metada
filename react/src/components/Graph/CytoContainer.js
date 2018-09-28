import React from 'react';
import cytoscape from 'cytoscape';
import { Helmet } from "react-helmet";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import ReactResizeDetector from 'react-resize-detector';

import 'font-awesome/css/font-awesome.min.css';


import { cytoParamsFromContainer } from '../../utils/cytoParams';
import getCytoData from '../../utils/getCytoData';
import HelpCard from './Help/HelpCard';


const styles = theme => ({
  cytoContainer: {
    height: "100%",
    minHeight: `calc(100vh - ${theme.spacing.unit * 3 * 7}px)`,
    // border: "black 2px solid"
  },
  cyDiv: {
    height: "100%",
    minHeight: `calc(100vh - ${theme.spacing.unit * 3 * 7}px)`,
    // border: "grey 2px solid",
  },
  pad: {
    paddingRight: "250px"
  }
})


let defaultStyle = {
  margin: 'auto',
  width: '70%',
  height: "100%",
  position: 'relative',
  display: 'flex',
  justifyContent: 'center'
};

function edgeLength(cy, edge) {
  const e = cy.$id('' + edge.data.id);
  const p1 = e.source().position();
  const p2 = e.target().position();
  const length = Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
  )
  return length
}

function findLevel(cy, cytoData, targetId, level, maxLength) {
  const edges = cytoData.edges.filter(
    edge => {
      return (
        edge.data.source === targetId || edge.data.target === targetId
      ) && (
          edgeLength(cy, edge) < maxLength
        )
    }
  );
  if (level === 1) {
    return edges.map(
      (edge, k) => {
        return edge.data.source === targetId ? edge.data.target : edge.data.source
      }
    )
  } else {
    return [].concat.apply(
      [],
      edges.map(
        (edge, k) => {
          return findLevel(
            cy,
            cytoData,
            edge.data.source === targetId ? edge.data.target : edge.data.source,
            level - 1,
            maxLength
          )
        }
      )
    );
  }
}


class CytoContainer extends React.Component {
  constructor(props) {
    super(props);
    this.props.updateEntityInfoBox(this.props.match.params.entityId);

    this.state = {
      update: false,
      focus: 0,
      lastTap: new Date().getTime(),
      longClickTimeout: null
    };
  }

  focusSearchBar = () => {
    this.setState({
      focus: this.state.focus + 1
    })
  }


  componentWillUnmount() {
    clearTimeout(this.state.longClickTimeout);
  }



  renderCytoscapeElement = () => {
    const time = false;
    if (time) {
      console.time('Full Cyto');
      console.time('      Data Cyto');
    }
    const container = this;
    const data = this.props.data;
    const id = this.props.match.params.entityId;
    const entity = data.entities.ids[id];
    let cytoData = getCytoData(data, entity);
    if (cytoData.nodes.length === 0) {
      localStorage.removeItem('cytoData_' + id);
      cytoData = getCytoData(data, entity);
    }

    if (time) {
      console.timeEnd('      Data Cyto');
      console.time('      Render Cyto');
    }
    var cyElement = document.getElementById('cy');
    const cy = cytoscape(cytoParamsFromContainer(cyElement, cytoData, entity.id, this.props.clientType, this.props.infoBox.entity));
    cy.ready(() => {
      cy.on(
        'tap',
        (event) => {
          if (event.target.isNode) {
            if (event.target.data()['category'] === 's') {
              return
            }
          } else if (!event.target.isEdge) {
            const now = new Date().getTime();
            let timesince = now - this.state.lastTap;
            if ((timesince < 400) && (timesince > 0)) {
              // double tap
              cy.fit();
            }
            this.setState({
              lastTap: new Date().getTime()
            })
            return
          }

          if (event.target.isEdge && event.target.isEdge()) {
            console.log('event.target :', event.target);
            console.log('edge length: ', edgeLength(cy,
              {
                data: event.target.data()
              }))
            return
          }

          const now = new Date().getTime();
          let timesince = now - this.state.lastTap;
          if ((timesince < 400) && (timesince > 0)) {
            // double tap
            const newLoc = `/graph/${event.target.id()}`;
            this.props.updateRouterLocation(newLoc);
            this.props.history.push(newLoc);
            this.props.toggleDoubleClickHelp(false);
            document.body.style.cursor = 'default';
            this.renderCytoscapeElement();

          } else {
            // too much time to be a doubletap
            container.props.updateEntityInfoBox(event.target.id());
          }

          this.setState({
            lastTap: new Date().getTime()
          })
        },
      ).on('tapend', (event) => {
        clearTimeout(this.state.longClickTimeout);
        return false;
      }).on('tapstart', (event) => {

        if (!event.target.isEdge || !event.target.isNode) {
          return
        }

        if (event.target.isEdge()) {
          return
        }

        this.setState({
          longClickTimeout: setTimeout(() => {
            container.props.updateEntityInfoBox(event.target.id());
            this.props.toggleDrawer(true);
            this.props.toggleLongClickHelp(false);
          }, 600)
        })
        return false;
      });
      cy.elements('node').on(
        'tapdrag',
        (event) => {
          clearTimeout(this.state.longClickTimeout);
        },
      );
      if (time) {
        console.timeEnd('      Render Cyto');
        console.timeEnd('Full Cyto');
      }
    });
    cy.on('mouseover', 'node', function (evt) {
      document.body.style.cursor = 'pointer';
    });
    cy.on('mouseout', 'node', function (evt) {
      document.body.style.cursor = 'default';
    });
    cy.on('tap', 'edge', (event) => {
      const data = event.target.data();
      // this.props.toggleDrawer(false);
      this.props.updateShareInfoBox(data);
    })

    if (cytoData.nodes.length > 6) {
      const idsToFit = findLevel(cy, cytoData, id, 3, 250).map(
        (v, k) => {
          return '#' + v
        }
      ).join(', ');
      // console.log('idsToFit :', idsToFit);
      cy.fit(idsToFit);
    } else {
      cy.fit()
    }


    cy.panningEnabled(true);
    cy.userPanningEnabled(true);
    cy.userZoomingEnabled(true);
    cy.zoomingEnabled(true);

    this.cy = cy;
  }

  componentDidUpdate(prevProps, prevState) {
    const location = parseInt(this.props.match.params.entityId, 10);
    if (location !== this.props.currentDisplay) {
      this.props.displayEntity(location);
      this.props.updateEntityInfoBox(location);
      this.renderCytoscapeElement();
      return
    }
  }

  componentDidMount() {
    this.setState({
      update: true
    });
    this.renderCytoscapeElement()
    console.log('CYTOCONTAINER', performance.now())

  }

  componentWillReceiveProps(nextProps) {

    const location = parseInt(nextProps.match.params.entityId, 10);
    if (location && (location !== nextProps.currentDisplay)) {
      nextProps.displayEntity(location);
      nextProps.updateEntityInfoBox(location);
      nextProps.reRenderGraph();
    }

  }


  componentWillUpdate(nextProps, nextState) {
    if (nextProps.show.drawer !== this.props.show.drawer || nextProps.renderStatus !== this.props.renderStatus) {
      setTimeout(this.renderCytoscapeElement, 300);
      if (!nextProps.show.drawer) {
        this.props.updateEntityInfoBox(parseInt(this.props.match.params.entityId, 10))
      }
    }
  }

  cyResize = () => {
      this.cy && this.cy.resize();
      this.cy && this.cy.fit();
      console.log('resize');
  }


  render() {

    const { classes, clientType, isRehydrated, show, stopHelp, translate, match, data } = this.props;

    if (!show.searchBar) {
      defaultStyle.marginTop = '20px'
    }

    const id = match.params.entityId;
    const entity = data.entities.ids[id];


    return (
      <div>
        <div id="cytoContainer" className={classes.cytoContainer}>
          <Helmet>
            <title>Metada - {entity.name}</title>
          </Helmet>
          <div id="cy" className={classes.cyDiv} onContextMenu={this.handleContextMenu} >
            <ReactResizeDetector refreshMode='debounce' refreshRate={200} skipOnMount handleWidth handleHeight onResize={this.cyResize} />
          </div>
        </div>
        <HelpCard
          clientType={clientType}
          isRehydrated={isRehydrated}
          show={show}
          stopHelp={stopHelp}
          translate={translate}
          reRenderGraph={this.renderCytoscapeElement} />
      </div>

    );
  }
}


CytoContainer.propTypes = {
  classes: PropTypes.object.isRequired,
  clientType: PropTypes.string.isRequired,
  currentDisplay: PropTypes.number.isRequired,
  data: PropTypes.object.isRequired,
  displayEntity: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  infoBox: PropTypes.object.isRequired,
  isRehydrated: PropTypes.bool.isRequired,
  match: PropTypes.object.isRequired,
  reRenderGraph: PropTypes.func.isRequired,
  show: PropTypes.object.isRequired,
  stopHelp: PropTypes.func.isRequired,
  toggleDoubleClickHelp: PropTypes.func.isRequired,
  toggleDrawer: PropTypes.func.isRequired,
  toggleLongClickHelp: PropTypes.func.isRequired,
  translate: PropTypes.func.isRequired,
  updateEntityInfoBox: PropTypes.func.isRequired,
  updateRouterLocation: PropTypes.func.isRequired,
  updateShareInfoBox: PropTypes.func.isRequired,
};


export default withStyles(styles)(CytoContainer);
