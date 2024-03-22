import { useState, useEffect } from "react";
import {
  Button, Spinner, Input,
  Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTitle,
  DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell,
  Dropdown, Option, SelectionEvents, OptionOnSelectData,
  TableColumnDefinition, TableCellLayout, TableRowId, createTableColumn,
  SelectionItemId,
  makeStyles, mergeClasses
} from "@fluentui/react-components";
import * as Config from "../../common/config";
import * as MOCKS from "../../mock-data";

import { Providers } from "@microsoft/mgt-element";

const useStyles = makeStyles({
  root: {
    maxHeight: '80%'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '10px'
  },
  formSelectorMode: {
    minWidth: '125px'
  },
  filterHorizontalRow: {
    display: 'flex',
    flexDirection: 'row',
    columnGap: '5px',
  },
  filtersVisible: {
    display: 'block'
  },
  filtersHidden: {
    display: 'none'
  },
  grid: {
    overflowY: 'scroll',
  }
});

interface ISearchResult {
  id: string;
  isContainer: boolean;
  displayName: string;
  downloadUrl: string;
  webUrl: string;
}

type SearchMode = { id: string; name: string; };
const searchModes: SearchMode[] = [
  { id: 'container', name: 'Containers' },
  { id: 'file', name: 'Files' }
];
type FileMediaType = { id: string; name: string; };
const fileMediaTypes: FileMediaType[] = [
  { id: '', name: 'All' },
  { id: 'docx', name: 'Word (docx)' },
  { id: 'xlsx', name: 'Excel (xlsx)' },
  { id: 'pptx', name: 'PowerPoint (pptx)' },
  { id: 'mp4', name: 'Video (mp4)' }
];

export interface IDialogSearchProps {
  isOpen: boolean;
  filterByContainerId?: string;
  onClose?: (containerId?: string) => void;
}

export const DialogSearch = (props: IDialogSearchProps) => {

  const [isWorking, setIsWorking] = useState(false);
  const [modeSearchContainer, setModeSearchContainer] = useState(false);  // true = container, false = content (files)
  const [searchResults, setSearchResults] = useState<ISearchResult[]>([]);

  const [selectedSearchMode, setSelectedSearchMode] = useState<SearchMode>(searchModes[0]);
  const [filterTitle, setFilterTitle] = useState<string>('');
  const [filterDescription, setFilterDescription] = useState<string>('');
  const [filterContent, setFilterContent] = useState<string>('');
  const [filterPropertyName, setFilterPropertyName] = useState<string>('');
  const [filterPropertyValue, setFilterPropertyValue] = useState<string>('');
  const [selectedFileMediaType, setSelectedFileMediaType] = useState<FileMediaType>(fileMediaTypes[0]);

  const [selectedRows, setSelectedRows] = useState<Set<SelectionItemId>>(new Set<TableRowId>([1]));

  useEffect(() => {
    setSearchMode();
  }, [props.filterByContainerId]);

  useEffect(() => {
    if (props.isOpen) {
      setSearchMode();
      setSearchResults([]);
      resetForm();
    }
  }, [props.isOpen]);

  const onSearchModeSelectionChange = (event: SelectionEvents, data: OptionOnSelectData) => {
    const selected = searchModes.find((mode) => mode.id === data.optionValue);
    if (selected) {
      setSelectedSearchMode(selected);
      setModeSearchContainer((selected.id === 'container'));
    }
  };

  const setSearchMode = () => {
    // if dialog opened when container selected in parent component, default to files
    // else if no container selected, default to container
    if (props.filterByContainerId) {
      setModeSearchContainer(false);
      setSelectedSearchMode(searchModes.find((mode) => mode.id !== 'container') as SearchMode);
    } else {
      setModeSearchContainer(true);
      setSelectedSearchMode(searchModes.find((mode) => mode.id === 'container') as SearchMode);
    }
  };

  const resetForm = () => {
    setFilterTitle('');
    setFilterDescription('');
    setFilterContent('');
    setFilterPropertyName('');
    setFilterPropertyValue('');
    setSelectedFileMediaType(fileMediaTypes[0]);
  };

  const executeSearch = async () => {
    setIsWorking(true);
    setSearchResults([]);

    const queryParameters: string[] = [];
    if (modeSearchContainer) {
      queryParameters.push(`ContainerTypeId:${Config.CONTAINER_TYPE_ID}`);
      if (filterTitle) {
        queryParameters.push(`Title:'${filterTitle}'`);
      }
      if (filterDescription) {
        queryParameters.push(`Description:'${filterDescription}'`);
      }
      if (filterPropertyName && filterPropertyValue) {
        queryParameters.push(`${filterPropertyName}:'${filterPropertyValue}'`);
      }
    } else {
      queryParameters.push(`ContainerId:${props.filterByContainerId}`);
      if (filterTitle) {
        queryParameters.push(`Title:'${filterTitle}'`);
      }
      if (filterDescription) {
        queryParameters.push(`'${filterContent}'`);
      }
      if (selectedFileMediaType.id) {
        queryParameters.push(`FileType:${selectedFileMediaType.id}`);
      }
    }

    const requestBody = {
      requests: [
        {
          entityTypes: [(modeSearchContainer) ? 'drive' : 'driveItem'],
          query: {
            query_string: {
              query: queryParameters.join(' AND ')
            }
          }
        }
      ]
    };
    const graphClient = Providers.globalProvider.graph.client;
    const graphResponse = await graphClient.api(`/search/query`)
                                           .version('beta')
                                           .post(requestBody);

    const results: ISearchResult[] = [];
    graphResponse.value[0].hitsContainers[0]?.hits?.forEach((searchResult: any) => {
      const result = searchResult._source;
      results.push({
        id: result.id,
        isContainer: modeSearchContainer,
        displayName: result.name,
        downloadUrl: '',
        webUrl: result.webUrl
      });
    });
    setSearchResults(results);

    resetForm();
    setIsWorking(false);
  };

  const onFileTypeSelect = (event: SelectionEvents, data: OptionOnSelectData) => {
    const selected = fileMediaTypes.find((mediaType) => mediaType.id === data.optionValue);
    if (selected) {
      setSelectedFileMediaType(selected);
    }
  };

  const onContainerSelected = (containerId: string) => {
    if (props.onClose) {
      props.onClose(containerId);
    }
  };

  const columns: TableColumnDefinition<ISearchResult>[] = [
    createTableColumn({
      columnId: 'searchResult',
      renderHeaderCell: () => {
        return (modeSearchContainer) ? 'Container Name' : 'File Name';
      },
      renderCell: (searchItem: ISearchResult) => {
        return (
          <TableCellLayout>
            {searchItem.displayName}
          </TableCellLayout>
        )
      }
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => {
        return 'Actions'
      },
      renderCell: (searchItem: ISearchResult) => {
        return (
          <>
            <Button
              aria-label="View Container"
              className={(searchItem.isContainer) ? styles.filtersVisible : styles.filtersHidden}
              onClick={() => { onContainerSelected(searchItem.id); }}>
              View&nbsp;Container
            </Button>
            <Button
              aria-label="Open File"
              className={(!searchItem.isContainer) ? styles.filtersVisible : styles.filtersHidden}>
              View&nbsp;File
            </Button>
          </>
        )
      }
    }),

  ];

  const columnSizingOptions = {
    searchResult: {
      minWidth: 150,
      defaultWidth: 250,
      idealWidth: 200
    },
    lastModifiedTimestamp: {
      minWidth: 150,
      defaultWidth: 150
    },
    actions: {
      minWidth: 250,
      defaultWidth: 250
    }
  };

  const submitButtonIcon = (isWorking) ? <Spinner size='tiny' /> : null;

  const styles = useStyles();

  return (
    <Dialog open={props.isOpen} modalType='modal'>
      <DialogSurface className={styles.root}>
        <DialogBody>
          <DialogTitle>Search Containers &amp; Content</DialogTitle>

          <DialogContent>
            <div className={styles.form}>
              <Dropdown
                placeholder='Search by:'
                className={styles.formSelectorMode}
                disabled={isWorking}
                selectedOptions={[selectedSearchMode.id]}
                value={selectedSearchMode.name}
                defaultValue={selectedSearchMode.name}
                defaultSelectedOptions={[selectedSearchMode.id]}
                onOptionSelect={onSearchModeSelectionChange}>
                {searchModes.map((mode) => (
                  <Option key={mode.id} value={mode.id}>{mode.name}</Option>
                ))}
              </Dropdown>

              <div className={styles.filterHorizontalRow}>
                <Input
                  placeholder={`${(modeSearchContainer) ? 'Container' : 'File'} title`}
                  disabled={isWorking}
                  value={filterTitle}
                  onChange={(e, d) => { setFilterTitle(d.value) }} />
                <Input
                  placeholder='Container description'
                  className={modeSearchContainer ? styles.filtersVisible : styles.filtersHidden}
                  disabled={isWorking}
                  value={filterDescription}
                  onChange={(e, d) => { setFilterDescription(d.value) }} />
                <Input
                  placeholder='File contents'
                  className={modeSearchContainer ? styles.filtersHidden : styles.filtersVisible}
                  disabled={isWorking}
                  value={filterContent}
                  onChange={(e, d) => { setFilterContent(d.value) }} />
              </div>

              <div className={styles.filterHorizontalRow}>
                <div className={mergeClasses(styles.filterHorizontalRow, (modeSearchContainer ? styles.filtersVisible : styles.filtersHidden))}>
                  <Input
                    placeholder='Custom property name'
                    disabled={isWorking}
                    value={filterPropertyName}
                    onChange={(e, d) => { setFilterPropertyName(d.value) }} />
                  &nbsp;:&nbsp;
                  <Input
                    placeholder='Custom property value'
                    disabled={isWorking}
                    value={filterPropertyValue}
                    onChange={(e, d) => { setFilterPropertyValue(d.value) }} />
                </div>
                <Dropdown
                  placeholder='File type'
                  disabled={isWorking}
                  className={(modeSearchContainer ? styles.filtersHidden : styles.filtersVisible)}
                  selectedOptions={[selectedFileMediaType.id]}
                  value={selectedFileMediaType.name}
                  onOptionSelect={onFileTypeSelect}>
                  {fileMediaTypes.map((mediaType) => (
                    <Option key={mediaType.id} value={mediaType.id}>{mediaType.name}</Option>
                  ))}
                </Dropdown>
                <Button
                  appearance='primary'
                  disabled={isWorking}
                  icon={submitButtonIcon}
                  onClick={executeSearch}>Search</Button>
              </div>
            </div>

            <DataGrid
              items={searchResults}
              columns={columns}
              getRowId={(item) => item.id}
              resizableColumns
              columnSizingOptions={columnSizingOptions}
              selectionMode='single'
              selectedItems={selectedRows}
              onSelectionChange={(e, d) => { setSelectedRows(d.selectedItems); }}>
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<ISearchResult>>
                {({ item, rowId }) => (
                  <DataGridRow<ISearchResult> key={rowId}>
                    {({ renderCell, columnId }) => (
                      <DataGridCell>
                        {renderCell(item)}
                      </DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </DialogContent>

          <DialogActions>
            <Button
              appearance='secondary'
              disabled={isWorking}
              onClick={() => { if (props.onClose) { props.onClose(); } }}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
