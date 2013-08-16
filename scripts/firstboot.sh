#!/bin/bash

SCRIPT_DIR=$(readlink -f ${0%/*})

#todo set hostname

#todo call expandFileSystem.sh

$SCRIPT_DIR/callhome.sh firstboot

#leave firstboot empty
mv $SCRIPT_DIR/firstboot.sh $SCRIPT_DIR/firstboot.sh.done
echo '#!/bin/bash' > $SCRIPT_DIR/firstboot.sh