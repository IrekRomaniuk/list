// This is mostly just hacks -- this is NOT necessarily 
// an indicator of how one should be writing code.
// </disclaimer>

import React, { Component } from 'react';
import styled from 'styled-components';
import Griddle, { plugins, RowDefinition, ColumnDefinition, utils } from 'griddle-react';
import debounce from 'lodash.debounce';
import conferences from './events.json';
import GoogleMapReact from 'google-map-react';
import CardList from './CardList';

import Add from './Add';
import './App.css';
import NoResults from './NoResults';
import moment from 'moment';
import UpdatePlugin from './UpdatePlugin';
import { mapKey } from './mapKey';

const { connect } = utils;


const mobileWidth = 1024;

// based on Griddle's default sort -- which is not very great out-of-the-box
const sortMethod = (data, column, sortAscending = true) => data.sort(
  (original, newRecord) => {
    original = ((!!original.get(column) && original.get(column)) || "").toUpperCase();
    newRecord = ((!!newRecord.get(column) && newRecord.get(column)) || "").toUpperCase();

    //TODO: This is about the most cheezy sorting check ever.
    //Make it better
    if(original === newRecord) {
      return 0;
    } else if (original > newRecord) {
      return sortAscending ? 1 : -1;
    }
    else {
      return sortAscending ? -1 : 1;
    }
  })

  // location sort
const locationSortMethod = (data, column, sortAscending = true) => data.sort(
  (original, newRecord) => {
    const getLocationValue = (record) => (
      `${record.get('country')}${record.get('stateProvince')}${record.get('city')}`.toUpperCase()
    );

    original = getLocationValue(original);
    newRecord = getLocationValue(newRecord);

    //TODO: This is about the most cheezy sorting check ever.
    //Make it better
    if(original === newRecord) {
      return 0;
    } else if (original > newRecord) {
      return sortAscending ? 1 : -1;
    }
    else {
      return sortAscending ? -1 : 1;
    }
  })

const ToggleButton = styled.button`
  margin-left:30px;
  margin-top: 5px;
`;

const Header = styled.header`
  height: 80px;
  background-color: hsl(171, 100%, 41%);
  color: white;
  padding: 20px 15px 0;
  width: 100%;
  position: absolute;
  top: 0;
  display: flex;
  justify-content: space-between;


  h1 {
    font-family: 'Exo', sans-serif;
    font-size: 26px;
  }

  div {
    max-width: 400px;
  }

  a, a:visited, a:hover {
    color: hsl(171, 80%, 73%);
  }

  @media(max-width: 760px) {
    text-align: center;

    div {
      display: none;
    }
  }
`;

const Footer = styled.footer`
  border-top: 2px solid #AAA;
  position: fixed;
  height: 100px;
  padding: 10px 15px 0 0;
  bottom: 0;
  background-color: #EDEDED;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
`

const FooterLeft = styled.div`
  width: 50%;
  padding-left: 15px;

  @media(max-width: ${mobileWidth}px) {
    width: 100%;
  }
`

const FooterRight = styled.div`
  width: 50%;
  bottom: 0;
  color: #AAA;
  position: relative;

  small { 
    width: 600px;
    max-width: 100%;
    position: absolute;
    bottom: 40px;
    right: 20px;
  }

  a, a:visited, a:hover {
    color: #555;
  }

  @media(max-width: ${mobileWidth}px) {
    width: 100%;

    small {
      position: initial;
    }
  }

`

const MapBlip = styled.div`
    border-radius: 50px;
    background-color: #512DA8;
    width: 25px;
    height: 25px;
    position: relative;
    top: -10px;
    left: -10px;
`;

const MapInfo = styled.div`
    background-color: #EDEDED;
    border: 1px solid #777;
    width: 150px;
    height: 70px;
    padding: 10px;
    position: relative;
    z-index: 9999;
    top: -10px;
    left: -10px;
`;

const GriddleWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  margin: 0 15px 15px 15px;
`

const ButtonGroupWrapper = styled.div`
  margin-top: 100px;
  width: 100%;
  justify-content: center !important; /* :( */
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-wrap: wrap-reverse;
  flex-direction: row;
  width: 100%;
  margin-bottom: 80px;
`

const MapWrapper = styled.div`
  min-height: 800px;
  width: 50%;

  @media (max-width: ${mobileWidth}px) {
    width: 100%;
  }
`

const TableWrapper = styled.div`
  width: 50%;

  div {
    width: 100%;
  }

  table {
    width: 100%;
    min-width: 100%;
    border-spacing: 0;
    font-size: 18px;
    height: 800px;
    min-height: 800px;
  }

  th {
    text-align: left;
    background-color: #EDEDED;
  }

  td {
    height: 90px;
    max-height: 90px;
    min-height: 90px;
    width: 25%;
  }

  td:first-child {
    padding-left: 15px;
  }

  @media (max-width: ${mobileWidth}px) {
    width: 100%;
  }
`

const FilterInput = styled.input`
  margin: 10px 0 10px 0;
`

const LocationWrapper = styled.div`
  small {
    font-size: 12px;
    display: block;
  }
`;

const DateColumnWrapper = styled.div`
  small {
    display: block;
    font-size: 12px;
  }
`;

class Filter extends Component {
  constructor(props) {
    super(props);

    // TODO: Don't do this
    this.setFilterDebounced = debounce(this.props.setFilter, 300);
  }

  setFilter = (e) => {
    this.setFilterDebounced(e.target.value);
  }

  render() {
    return (
      <FilterInput
        type="text"
        name="filter"
        className="input"
        placeholder="Filter"
        onChange={this.setFilter}
      />
    )
  }
}

class MarkerBlip extends Component {
  constructor(props) {
    super(props);
    this.state = { showInfo: false };
  }

  onMouseEnter = () => {
    this.setState({ showInfo: true });
  }

  onMouseLeave = () => {
    this.setState({ showInfo: false })
  }

  render() {
    return (
      <div
        onMouseLeave={this.onMouseLeave}
        key={this.props.url}
      >
        <MapBlip
          onMouseEnter={this.onMouseEnter}
        />
        {this.state.showInfo &&
          <MapInfo>
            <h4 style={{ margin: 0 }}>{this.props.name}</h4>
            {this.props.url && <a href={this.props.url}>{this.props.url}</a>}
          </MapInfo>
        }
      </div>
    )
  }
}

const Empty = (props) => <span />;
const Name = ({value, rowData}) => (
  <strong>
    { rowData.url ?
      <a href={rowData.url} target="_blank">{value}</a> :
      value
    }
  </strong>)

const Location = ({ rowData }) => (
  <LocationWrapper>
    <small>{rowData.city} {rowData.stateProvince}</small>
    <small>{rowData.country}</small>
  </LocationWrapper>
)

const dateFormat = (dateString) => (
  dateString ?
    moment(dateString).format('MM/DD/YYYY') :
    ''
)

const DateColumn = (start, end, keyColumn) => {
  if (!keyColumn) {
    return null;
  }

  return (
    <DateColumnWrapper>
      <small><strong>Start:</strong> {dateFormat(start)}</small>
      <small><strong>End:</strong> {dateFormat(end)}</small>
    </DateColumnWrapper>
  )
}

const EventDate = ({ rowData }) => (
  DateColumn(rowData.eventStartDate, rowData.eventEndDate, rowData.eventStartDate)
);

const CfpDate = ({ rowData }) => (
  DateColumn(rowData.cfpStartDate, rowData.cfpEndDate, rowData.cfpEndDate)
);

const Map = connect((state, props) => ({
  visibleData: plugins.LocalPlugin.selectors.filteredDataSelector(state),
}))(({ rowIds, Row, visibleData, filter }) => {
  const data = visibleData.toJSON();
  return (
      <GoogleMapReact
        defaultCenter={{ lat: 42.28, lng: -83.74 }}
        defaultZoom={4}
        bootstrapURLKeys={{
          key: mapKey,
        }}
      >
        {visibleData && data.map(r => <MarkerBlip key={r.name + r.city + r.country + r.eventStartDate} griddleKey={r.name} lat={r.latitude} lng={r.longitude} {...r} />)}
      </GoogleMapReact>
  )
});

const Layout = ({ Table, Pagination, Filter }) => (
  <GriddleWrapper>
    <Filter />
    <ContentWrapper>
      <MapWrapper>
        <Map />
      </MapWrapper>
      <TableWrapper>
        <Table />
      </TableWrapper>
    </ContentWrapper>
  </GriddleWrapper>
);

const EnhanceWithRowData = connect((state, props) => ({
  rowData: plugins.LocalPlugin.selectors.rowDataSelector(state, props)
}));

class VirtualScrollTable extends Component {
  render() {
    const { data } = this.props;

    return (
      <Griddle
        data={data}
        plugins={[UpdatePlugin, plugins.LocalPlugin, plugins.PositionPlugin({ tableHeight: 799, rowHeight: 92 })]}
        pageProperties={{
          pageSize: 1000000
        }}
        styleConfig={{
          classNames: {
            Table: 'table'
          }
        }}
        components={{
          Filter: Filter,
          SettingsToggle: Empty,
          Pagination: Empty,
          Layout: Layout,
          NoResults
        }}
      >
        <RowDefinition>
          <ColumnDefinition
            id='name'
            title="Name"
            order={1}
            customComponent={EnhanceWithRowData(Name)}
            sortMethod={sortMethod}
          />
          <ColumnDefinition
            id='city'
            title="Location"
            order={2}
            customComponent={EnhanceWithRowData(Location)}
            sortMethod={locationSortMethod}
          />
          <ColumnDefinition
            id='eventStartDate'
            title='Event Date'
            order={3}
            customComponent={EnhanceWithRowData(EventDate)}
            sortMethod={sortMethod}
          />
          <ColumnDefinition
            id='cfpEndDate'
            title='CFP Date'
            order={4}
            customComponent={EnhanceWithRowData(CfpDate)}
            sortMethod={sortMethod}
          />
        </RowDefinition>
      </Griddle>
    )
  }
}

const ButtonGroup = ({onSelect, selected, toggleForm, isMobile}) => {
  return (
    <ButtonGroupWrapper className="field has-addons">
      <div className="control">
        <a className={`button ${selected === 'all' && 'is-primary'}`} onClick={() => onSelect('all')}>
          <span>All</span>
        </a>
      </div>
      <div className="control">
        <a className={`button ${selected === 'upcoming' && 'is-primary'}`} onClick={() => onSelect('upcoming')}>
          <span>Upcoming</span>
        </a>
      </div>
      <div className="control">
        <a className={`button ${selected === 'openCfps' && 'is-primary'}`} onClick={() => onSelect('openCfps')}>
          <span>Open CFPs</span>
        </a>
      </div>
      { !isMobile &&
        <ToggleButton onClick={toggleForm} className="button is-small">Toggle 'Add Event' Form</ToggleButton>
      }
    </ButtonGroupWrapper>
  )
}
class App extends Component {
  state = { dataType: 'all', showForm: false }

  onSelect=(dataType) => {
    this.setState({ dataType });
  }

  onToggleForm = () => {
    this.setState(prevState => ({ showForm: !prevState.showForm }))
  }

  getData = () => {
    const { dataType } = this.state;

    switch(dataType) {
      case 'upcoming':
        return conferences.filter(conference => (
          conference.eventStartDate && conference.eventStartDate > moment().toISOString()
        ))
      case 'openCfps':
        return conferences.filter(conference => (
          conference.cfpEndDate && conference.cfpEndDate > moment().toISOString()
        ))
      default:
        return conferences;
    }
  }

  render() {
    const data = this.getData();

    const isMobileish = window.innerWidth < mobileWidth;
    const ListComponent = isMobileish ?
      <CardList data={data} /> :
      <VirtualScrollTable data={data}/>;

    return (
      <div>
      <Header>
        <h1>Conference Radar</h1>
        <div>
          <p>
            Know of a conference not listed? Notice an issue?
          </p>
          <a href="https://github.com/conferenceradar/list">Contribute to this project on GitHub</a>
        </div>
      </Header>
      <ButtonGroup
        onSelect={this.onSelect}
        selected={this.state.dataType}
        toggleForm={this.onToggleForm}
        isMobile={isMobileish}
      />
      { !isMobileish && this.state.showForm && <Add /> }
      {ListComponent}
      <Footer>
        <FooterLeft>
          <p>
            The data is based on conference lists from <a href="https://twitter.com/heathriel">Heather Wilde</a> and <a href="https://twitter.com/housecor">Cory House</a>.
          </p>
          <p>
            Site compiled by <a href="https://twitter.com/ryanlanciaux">Ryan Lanciaux</a> using <a href="https://github.com/facebookincubator/create-react-app">Create React App</a> with <a href="http://griddlegriddle.github.io/Griddle">Griddle</a>
          </p>
        </FooterLeft>
        <FooterRight>
          <small>
            This is a community maintained site/list provided as-is without guarantee or warranty. If you notice an issue or innacuracy, please <a href="https://github.com/conferenceradar/list">file an issue/PR on GitHub</a>. 
          </small>
        </FooterRight>
      </Footer>
      </div>
    );
  }
}

export default App;